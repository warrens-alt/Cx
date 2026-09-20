const fs = require('fs');
let source = fs.readFileSync('src/pages/SourceAnalysis.tsx', 'utf8');

// I'll just strip out the whole "Performance Drivers" section block by finding it.
const driverStart = source.indexOf('<div className="mt-8 bg-card-bg rounded-xl border border-slate-200 shadow-sm overflow-hidden">');
if(driverStart > -1) {
  source = source.substring(0, driverStart) + '    </div>\n  );\n}';
}
fs.writeFileSync('src/pages/SourceAnalysis.tsx', source);

let cohorts = fs.readFileSync('src/pages/Cohorts.tsx', 'utf8');
const maturityStart = cohorts.indexOf('<div className="mt-8 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">');
if(maturityStart > -1) {
  cohorts = cohorts.substring(0, maturityStart) + '    </div>\n  );\n}';
}
fs.writeFileSync('src/pages/Cohorts.tsx', cohorts);
