const fs = require('fs');
let nav = fs.readFileSync('src/components/Navigation.tsx', 'utf8');

if (!nav.includes('href: "/data-coverage"')) {
  nav = nav.replace(
    /        \{ name: 'Data Quality', href: '\/data-quality', icon: ShieldCheck \}/,
    "        { name: 'Data Quality', href: '/data-quality', icon: ShieldCheck },\n        { name: 'Data Coverage', href: '/data-coverage', icon: Database }"
  );
}

fs.writeFileSync('src/components/Navigation.tsx', nav);
