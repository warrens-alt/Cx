import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Rename Lifecycle Lag to Velocity Analytics
content = content.replace(
  "{ name: 'Lifecycle Lag', path: '/lifecycle-lag', icon: Clock },",
  "{ name: 'Velocity Analytics', path: '/lifecycle-lag', icon: Zap }," // using Zap for velocity
);

// Remove Speed-to-Lead from sidebar since it's now in Velocity Analytics
content = content.replace(
  "{ name: 'Speed-to-Lead', path: '/speed-to-lead', icon: Clock },\n",
  ""
);

fs.writeFileSync('src/App.tsx', content);
