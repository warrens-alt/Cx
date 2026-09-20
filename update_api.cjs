const fs = require('fs');

let apiTs = fs.readFileSync('server/api.ts', 'utf8');

// import it
apiTs = apiTs.replace(/getLeads, getLeadTimeline,/, 'getLeads, getLeadTimeline, getHlcVendorCoverage,');

// add route
const route = `
  app.get('/api/analytics/hlc-coverage', async (req, res) => {
    try {
      const params = extractQueryParams(req);
      const data = await getHlcVendorCoverage(params);
      res.json({ success: true, data });
    } catch (e: any) {
      console.error('HLC Coverage error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
`;

apiTs = apiTs.replace(/app\.get\('\/api\/analytics\/parameter-coverage', async \(req, res\) => \{[\s\S]*?\}\);/, match => match + '\n' + route);

fs.writeFileSync('server/api.ts', apiTs);
