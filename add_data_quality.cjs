const fs = require('fs');
let file = fs.readFileSync('src/components/GlobalFilter.tsx', 'utf8');

const additionalHtml = `
          <div className="space-y-4">
            <h3 className="text-[11px] font-bold tracking-widest text-text-mute uppercase border-b pb-2">Data Quality</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Valid Lead (Overall)</label>
              <select className="w-full border rounded-md p-2 text-sm bg-white" value={getBooleanFilterValue('valid_lead')} onChange={(e) => handleBooleanFilter('valid_lead', e.target.value)}>
                <option value="">All</option>
                <option value="true">Valid</option>
                <option value="false">Invalid</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Valid ID / National Number</label>
              <select className="w-full border rounded-md p-2 text-sm bg-white" value={getBooleanFilterValue('valid_idno')} onChange={(e) => handleBooleanFilter('valid_idno', e.target.value)}>
                <option value="">All</option>
                <option value="true">Valid</option>
                <option value="false">Invalid</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-sec">Valid Phone Number</label>
              <select className="w-full border rounded-md p-2 text-sm bg-white" value={getBooleanFilterValue('phone_valid')} onChange={(e) => handleBooleanFilter('phone_valid', e.target.value)}>
                <option value="">All</option>
                <option value="true">Valid</option>
                <option value="false">Invalid</option>
              </select>
            </div>
          </div>
`;

file = file.replace(/(<div className="space-y-4">\s*<h3 className="text-\[11px\] font-bold tracking-widest text-text-mute uppercase border-b pb-2">Activity<\/h3>)/, additionalHtml + '\n          $1');

fs.writeFileSync('src/components/GlobalFilter.tsx', file);
