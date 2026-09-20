const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  "import { Activity, Database, Settings } from 'lucide-react';",
  "import { Activity, Database, Settings, Calculator } from 'lucide-react';"
);

content = content.replace(
  "import SettingsPage from './pages/Settings';",
  "import SettingsPage from './pages/Settings';\nimport AssumptionsPage from './pages/Assumptions';"
);

content = content.replace(
  "{ name: 'Settings', path: '/settings', icon: Settings },",
  "{ name: 'Settings', path: '/settings', icon: Settings },\n    { name: 'Assumptions', path: '/assumptions', icon: Calculator },"
);

content = content.replace(
  "<Route path=\"/settings\" element={<SettingsPage />} />",
  "<Route path=\"/settings\" element={<SettingsPage />} />\n              <Route path=\"/assumptions\" element={<AssumptionsPage />} />"
);

fs.writeFileSync('src/App.tsx', content);
