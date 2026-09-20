const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard imports with lazy ones
const pagesToLazy = [
  'Overview', 'Funnel', 'SpeedToLead', 'CallPerformance', 'Cohorts',
  'SourceAnalysis', 'QualityVetting', 'DataQuality', 'LeadExplorer',
  'SettingsPage', 'DataCoverage', 'Acquisition', 'Outcomes', 'Explore', 'Insights'
];

pagesToLazy.forEach(page => {
  const regex = new RegExp(`import ${page} from '\\.\\/pages\\/(${page}|Settings)';`);
  const match = app.match(regex);
  if (match) {
    app = app.replace(regex, `const ${page} = React.lazy(() => import('./pages/${match[1]}'));`);
  }
});

// ensure React, Suspense are imported
if (!app.includes('import React')) {
  app = `import React, { Suspense } from 'react';\n` + app;
} else if (!app.includes('Suspense')) {
  app = app.replace(/import React(.*?)/, "import React, { Suspense$1");
}

app = app.replace(/<Routes>/, "<Suspense fallback={<div className=\"p-8 flex justify-center\"><div className=\"animate-pulse text-text-sec\">Loading module...</div></div>}>\n              <Routes>");
app = app.replace(/<\/Routes>/, "</Routes>\n              </Suspense>");

fs.writeFileSync('src/App.tsx', app);
