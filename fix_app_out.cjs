const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes('import Outcomes')) {
  app = app.replace(
    "import Acquisition from './pages/Acquisition';",
    "import Acquisition from './pages/Acquisition';\nimport Outcomes from './pages/Outcomes';"
  );
  
  app = app.replace(
    "<Route path=\"/acquisition\" element={<Acquisition />} />",
    "<Route path=\"/acquisition\" element={<Acquisition />} />\n                <Route path=\"/outcomes\" element={<Outcomes />} />"
  );
}

fs.writeFileSync('src/App.tsx', app);
