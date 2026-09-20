const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

// Replace the placeholder Vendor dropdown I added with an actual <select> element
const vendorDropdown = `
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-teal tracking-wider leading-tight">Vendor</span>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="text-sm font-semibold text-text-main bg-transparent border-none outline-none cursor-pointer appearance-none pr-4"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right center', backgroundSize: '1em' }}
            >
              <option value="">All Vendors</option>
              {options.vendors?.map((v: any) => (
                <option key={v.value || v} value={v.value || v}>
                  {v.label || v} {v.uniqueLeads ? \`(\${v.uniqueLeads.toLocaleString()} leads)\` : ''}
                </option>
              ))}
            </select>
          </div>
`;

content = content.replace(
  /<div className="flex items-center gap-2 pr-4 cursor-pointer relative" onClick=\{[\s\S]*?<\/div>\n            <ChevronDown className="w-4 h-4 text-text-mute ml-1" \/>\n          <\/div>/,
  vendorDropdown
);

// Also fix the residual vendor references
content = content.replace(
  /<div className="flex items-center gapx-3 py-1\.5">\s*<label className="text-\[13px\] font-medium text-text-sec tracking-tight">Vendor<\/label>\s*<select[\s\S]*?<\/select>\s*<\/div>/,
  ''
);

content = content.replace(
  /<div className="space-y-2">\s*<label className="text-sm font-medium text-text-sec">Vendor<\/label>\s*<select className="w-full border rounded-md px-3 py-1\.5 text-sm bg-white" value=\{vendor\} onChange=\{\(e\) => setVendor\(e\.target\.value\)\}>\s*<option value="">All Vendors<\/option>\s*\{options\.vendors\?\.map\(\(v: any\) => <option key=\{v\} value=\{v\}>\{v\}<\/option>\)\}\s*<\/select>\s*<\/div>/,
  ''
);

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
