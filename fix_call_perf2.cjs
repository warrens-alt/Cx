const fs = require('fs');
let content = fs.readFileSync('src/pages/CallPerformance.tsx', 'utf8');

content = content.replace(/<\/div>\s*<div className="overflow-x-auto border border-slate-200 rounded-lg">/, `</div>
        <div className="enterprise-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle bg-surface-sec">
            <h3 className="text-card-title text-text-main font-semibold">Call Attempt Performance Matrix</h3>
          </div>
          <div className="overflow-x-auto">`);

// Replace the closing div of the old enterprise-card which was at the very end.
content = content.replace(/<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/, `</table>
          </div>
        </div>
    </div>
  </div>`);

fs.writeFileSync('src/pages/CallPerformance.tsx', content);
