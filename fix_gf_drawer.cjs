const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

const oldDrawerVendor = `<div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Vendor</label>
              <select className="w-full border rounded-md px-3 py-1.5 text-sm bg-white" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="">All Vendors</option>
                {options.vendors?.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>`;

const newDrawerVendor = `<div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Vendor</label>
              <select className="w-full border rounded-md px-3 py-1.5 text-sm bg-white" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="">All Vendors</option>
                {options.vendors?.map((v: any) => (
                  <option key={v.value || v} value={v.value || v}>
                    {v.label || v} {v.uniqueLeads ? \`(\${v.uniqueLeads.toLocaleString()} leads)\` : ''}
                  </option>
                ))}
              </select>
            </div>`;

content = content.replace(
  /<div className="space-y-2">\s*<label className="text-sm font-medium text-text-sec">Vendor<\/label>\s*<select className="w-full border rounded-md px-3 py-1\.5 text-sm bg-white" value=\{vendor\} onChange=\{\(e\) => setVendor\(e\.target\.value\)\}>\s*<option value="">All Vendors<\/option>\s*\{options\.vendors\?\.map\(\(v: string\) => <option key=\{v\} value=\{v\}>\{v\}<\/option>\)\}\s*<\/select>\s*<\/div>/,
  newDrawerVendor
);

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
