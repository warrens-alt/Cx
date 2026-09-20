const fs = require('fs');
let content = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

// The original issue was replacing just <label> through </select>\n</div>
// Let's just fix the block exactly.
content = content.replace(
  /<div className="space-y-2">\n              <div className="space-y-2">\n              <label className="text-sm font-medium text-text-sec">Medium<\/label>\n              <select className="w-full border rounded-md p-2 text-sm bg-white" value={medium} onChange={\(e\) => setMedium\(e\.target\.value\)}>\n                <option value="">All Mediums<\/option>\n                {options\.mediums\?\.map\(\(m: string\) => <option key={m} value={m}>{m}<\/option>\)}\n              <\/select>\n            <\/div>\n            \n            <div className="space-y-2">\n              <label className="text-sm font-medium text-text-sec">Vendor<\/label>\n              <select className="w-full border rounded-md p-2 text-sm bg-white" value={vendor} onChange={\(e\) => setVendor\(e\.target\.value\)}>\n                <option value="">All Vendors<\/option>\n                {options\.vendors\?\.map\(\(v: string\) => <option key={v} value={v}>{v}<\/option>\)}\n              <\/select>\n            <\/div>\n          <\/div>/,
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
            </div>
          </div>`
);

fs.writeFileSync('src/components/GlobalFilter.tsx', content);
