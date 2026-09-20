const fs = require('fs');
let content = fs.readFileSync('src/lib/FilterContext.tsx', 'utf8');

content = content.replace(
  'vendor: string;\n  setVendor: (val: string) => void;',
  'vendor: string;\n  setVendor: (val: string) => void;\n  medium: string;\n  setMedium: (val: string) => void;'
);

content = content.replace(
  'const vendor = filters.vendor && filters.vendor.operator === \'in\' ? filters.vendor.values?.join(\',\') || \'\' : \'\';',
  'const vendor = filters.vendor && filters.vendor.operator === \'in\' ? filters.vendor.values?.join(\',\') || \'\' : \'\';\n  const medium = filters.medium && filters.medium.operator === \'in\' ? filters.medium.values?.join(\',\') || \'\' : \'\';'
);

content = content.replace(
  'vendor, setVendor: (val) => setFilter(\'vendor\', val ? { operator: \'in\', values: val.split(\',\') } : null)',
  'vendor, setVendor: (val) => setFilter(\'vendor\', val ? { operator: \'in\', values: val.split(\',\') } : null),\n      medium, setMedium: (val) => setFilter(\'medium\', val ? { operator: \'in\', values: val.split(\',\') } : null)'
);

fs.writeFileSync('src/lib/FilterContext.tsx', content);
