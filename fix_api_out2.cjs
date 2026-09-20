const fs = require('fs');
let api = fs.readFileSync('server/api.ts', 'utf8');

if (!api.includes('getOutcomesStats')) {
  api = api.replace(
    /getAcquisitionStats\n\} from '\.\/bigquery\/queries';/,
    "getAcquisitionStats,\n  getOutcomesStats\n} from './bigquery/queries';"
  );
  
  const endpoint = `
analyticsRouter.get('/outcomes', async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getOutcomesStats(params);
    res.json(buildResponse(req, stats, 'vw_lead_lifecycle'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
`;
  api = api.replace(
    "analyticsRouter.get('/leads'",
    endpoint + "analyticsRouter.get('/leads'"
  );
  fs.writeFileSync('server/api.ts', api);
}
