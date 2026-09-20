const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('import Acquisition')) {
  app = app.replace(
    "import DataCoverage from './pages/DataCoverage';",
    "import DataCoverage from './pages/DataCoverage';\nimport Acquisition from './pages/Acquisition';"
  );
  
  app = app.replace(
    "<Route path=\"/data-coverage\" element={<DataCoverage />} />",
    "<Route path=\"/data-coverage\" element={<DataCoverage />} />\n                <Route path=\"/acquisition\" element={<Acquisition />} />"
  );
}

fs.writeFileSync('src/App.tsx', app);
