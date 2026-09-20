const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.tsx', 'utf8');

content = content.replace(
  'setData(d.data || []);',
  `const formattedData = (d.data || []).map((row: any) => {
              const newRow = { ...row };
              if (newRow.hlc_details && Array.isArray(newRow.hlc_details) && newRow.hlc_details.length > 0) {
                const hlc = newRow.hlc_details[0];
                Object.keys(hlc).forEach(k => {
                  newRow[\`hlc_\${k}\`] = hlc[k];
                });
                delete newRow.hlc_details;
              }
              return newRow;
            });
            setData(formattedData);`
);

fs.writeFileSync('src/pages/Settings.tsx', content);
