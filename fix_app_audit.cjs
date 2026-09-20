const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('DataAudit')) {
  content = content.replace(/const Outcomes = React\.lazy\(\(\) => import\('\.\/pages\/Outcomes'\)\);/, `const Outcomes = React.lazy(() => import('./pages/Outcomes'));\nconst DataAudit = React.lazy(() => import('./pages/DataAudit'));`);
  
  content = content.replace(/{ name: 'Admin', path: '\/admin', icon: SettingsIcon }/, `{ name: 'Admin', path: '/admin', icon: SettingsIcon },\n        { name: 'Data Audit', path: '/audit', icon: Search }`);
  
  content = content.replace(/<Route path="\/data-coverage" element={<DataCoverage \/>} \/>/, `<Route path="/data-coverage" element={<DataCoverage />} />\n                <Route path="/audit" element={<DataAudit />} />`);
  
  fs.writeFileSync('src/App.tsx', content);
}
