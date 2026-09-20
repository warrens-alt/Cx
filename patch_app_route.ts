import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('MultiHopArbitrage')) {
  // Add import
  content = content.replace(
    "import SettingsPage from './pages/Settings';",
    "import SettingsPage from './pages/Settings';\nimport MultiHopArbitrage from './pages/MultiHopArbitrage';"
  );
  
  // Add route
  content = content.replace(
    "<Route path=\"/settings\" element={<SettingsPage />} />",
    "<Route path=\"/multi-hop-arbitrage\" element={<MultiHopArbitrage />} />\n              <Route path=\"/settings\" element={<SettingsPage />} />"
  );
  
  fs.writeFileSync('src/App.tsx', content);
  console.log("Patched App.tsx");
}

let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if (!sidebar.includes('/multi-hop-arbitrage')) {
  // Add to sidebar under Pipeline
  sidebar = sidebar.replace(
    "{ name: 'Call Centre Intelligence', icon: HeadphonesIcon, path: '/call-centre' },",
    "{ name: 'Call Centre Intelligence', icon: HeadphonesIcon, path: '/call-centre' },\n      { name: 'Multi-Hop Arbitrage', icon: GitMerge, path: '/multi-hop-arbitrage' },"
  );
  
  // Need to import GitMerge if not there
  if (!sidebar.includes('GitMerge')) {
    sidebar = sidebar.replace(
      "import { ",
      "import { GitMerge, "
    );
  }
  
  fs.writeFileSync('src/components/Sidebar.tsx', sidebar);
  console.log("Patched Sidebar.tsx");
}

