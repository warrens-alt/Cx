const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

if (!app.includes("name: 'Data Coverage'")) {
  app = app.replace(
    "{ name: 'Data Quality', path: '/data-quality', icon: ShieldAlert },",
    "{ name: 'Data Quality', path: '/data-quality', icon: ShieldAlert },\n        { name: 'Data Coverage', path: '/data-coverage', icon: Activity },"
  );
}

fs.writeFileSync('src/App.tsx', app);
