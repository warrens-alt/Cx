const fs = require('fs');
let code = fs.readFileSync('src/pages/UserJourney.tsx', 'utf8');

code = code.replace(/const \{ source, medium, startMonth, endMonth \} = useFilters\(\);/g, "const { source, vendor, startMonth, endMonth } = useFilters();");
code = code.replace(/if \(medium\) params\.append\('medium', medium\);/g, "if (vendor) params.append('vendor', vendor);");
code = code.replace(/\[source, medium, startMonth, endMonth\]/g, "[source, vendor, startMonth, endMonth]");

fs.writeFileSync('src/pages/UserJourney.tsx', code);
