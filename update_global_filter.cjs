const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

// Remove ClientContext
content = content.replace(/import \{ useClient \} from '\.\.\/lib\/ClientContext';\n/, '');
content = content.replace(/const \{ selectedClient, setSelectedClient, clients \} = useClient\(\);\n/, '');

// Change filter-options query to use default client
content = content.replace(
  /const queryParams = new URLSearchParams\(\{ clientId: selectedClient \|\| 'default' \}\);/,
  "const queryParams = new URLSearchParams({ clientId: 'default_tenant' });"
);

content = content.replace(/selectedClient, /g, "");
content = content.replace(/\[selectedClient, startDate, endDate\]/g, "[startDate, endDate]");

// Replace Client dropdown with Vendor dropdown
const vendorDropdown = `
          <div className="flex items-center gap-2 pr-4 cursor-pointer relative" onClick={() => setDrawerOpen(true)}>
            <div className="w-6 h-6 rounded bg-[#10283B] flex items-center justify-center border border-[#24323C]">
              <Filter className="w-3.5 h-3.5 text-slate-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-teal tracking-wider leading-tight">Vendor</span>
              <span className="text-sm font-semibold text-text-main truncate max-w-[150px]">
                {vendor ? options.vendors?.find((v:any) => v.value === vendor)?.label || vendor : 'All Vendors'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-text-mute ml-1" />
          </div>
`;

content = content.replace(
  /<div className="flex flex-col">[\s\S]*?<span className="text-\[10px\] uppercase font-bold text-teal tracking-wider leading-tight">Client<\/span>[\s\S]*?\{clients\.length > 0 \? \([\s\S]*?<\/select>[\s\S]*?\) : \([\s\S]*?<\/span>[\s\S]*?\)\}[\s\S]*?<\/div>/,
  vendorDropdown
);

// We need to also clean up the duplicate vendor filter in the other row
// Specifically this block:
// <div className="flex items-center gapx-3 py-1.5 hidden lg:flex">
//   <label className="text-[13px] font-medium text-text-sec tracking-tight">Vendor</label> ...
const redundantVendorFilterRegex = /<div className="flex items-center gap-2 pl-3 border-l border-border-subtle">[\s\S]*?<label className="text-\[13px\] font-medium text-text-sec tracking-tight">Vendor<\/label>[\s\S]*?<\/select>[\s\S]*?<\/div>/;
content = content.replace(redundantVendorFilterRegex, '');

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
