const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('UserJourneyPage')) {
  content = content.replace(
    "import AssumptionsPage from './pages/Assumptions';",
    "import AssumptionsPage from './pages/Assumptions';\nimport UserJourneyPage from './pages/UserJourney';"
  );

  content = content.replace(
    "import { Activity, Database, Settings, Calculator } from 'lucide-react';",
    "import { Activity, Database, Settings, Calculator, Map as MapIcon } from 'lucide-react';"
  );

  content = content.replace(
    "{ name: 'Assumptions', path: '/assumptions', icon: Calculator },",
    "{ name: 'Assumptions', path: '/assumptions', icon: Calculator },\n    { name: 'User Journey', path: '/journey', icon: MapIcon },"
  );

  content = content.replace(
    "<Route path=\"/assumptions\" element={<AssumptionsPage />} />",
    "<Route path=\"/assumptions\" element={<AssumptionsPage />} />\n              <Route path=\"/journey\" element={<UserJourneyPage />} />"
  );

  fs.writeFileSync('src/App.tsx', content);
}
