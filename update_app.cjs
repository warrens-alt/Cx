const fs = require('fs');

let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add imports if missing
if (!app.includes('Explore')) {
  app = app.replace(/import Ledger from '\.\/pages\/Ledger';/, "import Ledger from './pages/Ledger';\nimport Explore from './pages/Explore';\nimport Insights from './pages/Insights';");
}

// Add routes if missing
if (!app.includes('<Route path="/explore"')) {
  app = app.replace(/<Route path="\/ledger" element=\{<Ledger \/>\} \/>/, "<Route path=\"/ledger\" element={<Ledger />} />\n            <Route path=\"/explore\" element={<Explore />} />\n            <Route path=\"/insights\" element={<Insights />} />");
}

// Add to Sidebar navigation
if (!app.includes('to="/insights"')) {
  // Find the exact sidebar block
  app = app.replace(
    /const navItems = \[([^\]]+)\];/,
    "const navItems = [$1, { icon: <LineChart className=\"w-4 h-4\" />, label: 'Insights', path: '/insights' }, { icon: <Compass className=\"w-4 h-4\" />, label: 'Explore', path: '/explore' }];"
  );
  
  // Need to import Compass and LineChart if not there, let's just make sure we have enough icons
  if (!app.includes('Compass')) {
    app = app.replace(/import \{ ([^}]+) \} from 'lucide-react';/, "import { $1, Compass, LineChart } from 'lucide-react';");
  }
}

fs.writeFileSync('src/App.tsx', app);
