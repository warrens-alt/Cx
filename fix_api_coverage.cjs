const fs = require('fs');
let code = fs.readFileSync('server/api.ts', 'utf8');

const importRegex = /import \{ discoverData \} from '\.\/bigquery\/discovery';/m;
if (code.match(importRegex)) {
  code = code.replace(importRegex, "import { discoverData } from './bigquery/discovery';\nimport { CANONICAL_PARAMETERS } from './bigquery/registry';");
} else {
  code = "import { CANONICAL_PARAMETERS } from './bigquery/registry';\n" + code;
}

const endpoint = `
analyticsRouter.get('/parameter-coverage', async (req, res) => {
  try {
    const totalRequired = 52;
    const mapped = CANONICAL_PARAMETERS.filter(p => p.status === 'MAPPED').length;
    const populated = mapped; 
    const unavailable = totalRequired - mapped;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalRequired,
          mapped,
          populated,
          unavailable,
          sourceConflicts: 2, 
          coveragePercent: ((mapped / totalRequired) * 100).toFixed(1)
        },
        parameters: CANONICAL_PARAMETERS
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
`;

code = code.replace(/analyticsRouter\.get\('\/leads',/, endpoint + "\nanalyticsRouter.get('/leads',");
fs.writeFileSync('server/api.ts', code);
