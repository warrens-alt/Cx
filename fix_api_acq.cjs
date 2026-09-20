const fs = require('fs');
let api = fs.readFileSync('server/api.ts', 'utf8');

if (!api.includes('getAcquisitionStats')) {
  api = api.replace(
    /getFilterOptions\n\} from '\.\/bigquery\/queries';/,
    "getFilterOptions,\n  getAcquisitionStats\n} from './bigquery/queries';"
  );
  
  const endpoint = `
analyticsRouter.get('/acquisition', async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getAcquisitionStats(params);
    res.json(buildResponse(req, stats, 'vw_marketing_daily'));
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
