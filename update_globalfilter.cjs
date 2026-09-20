const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

content = content.replace(
  'vendor, setVendor',
  'vendor, setVendor,\n    medium, setMedium'
);

content = content.replace(
  '{ sources: [], vendors: [], grades: [], vettings: [] }',
  '{ sources: [], vendors: [], mediums: [], grades: [], vettings: [] }'
);

// Drawer filter section
content = content.replace(
  /<label className="text-sm font-medium text-text-sec">Vendor \(Medium\)<\/label>[\s\S]*?<\/select>\n            <\/div>/,
  `<div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Medium</label>
              <select className="w-full border rounded-md p-2 text-sm bg-white" value={medium} onChange={(e) => setMedium(e.target.value)}>
                <option value="">All Mediums</option>
                {options.mediums?.map((m: string) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Vendor</label>
              <select className="w-full border rounded-md p-2 text-sm bg-white" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                <option value="">All Vendors</option>
                {options.vendors?.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>`
);

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
