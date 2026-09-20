const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const routes = [
  { path: '/api/lead-ledger', table: 'tableLedger', type: 'fetched', wherePos: 'before_limit' },
  { path: '/api/insights', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/overview', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/funnel', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/pipeline-waterfall', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/revenue', table: 'tableOffline', type: 'date', wherePos: 'before_group_by' },
  { path: '/api/commercial-control', table: 'tableOffline', type: 'date', wherePos: 'before_group_by' },
  { path: '/api/sources', table: 'tableOffline', type: 'date', wherePos: 'before_group_by' },
  { path: '/api/vendors', table: 'tableOffline', type: 'date', wherePos: 'before_group_by', alias: 'o', alias_ledger: 'v' },
  { path: '/api/agents', table: 'tableCall', type: 'call_date', wherePos: 'after_where' },
  { path: '/api/calls', table: 'tableCall', type: 'call_date', wherePos: 'end' },
  { path: '/api/call-results', table: 'tableCall', type: 'call_date', wherePos: 'after_where' },
  { path: '/api/lifecycle', table: 'tableLedger', type: 'fetched', wherePos: 'end' },
  { path: '/api/speed-to-lead', table: 'tableLedger', type: 'fetched', wherePos: 'after_where' },
  { path: '/api/retry-strategy', table: 'tableCall', type: 'call_date', wherePos: 'after_where' },
  { path: '/api/brand/mondo', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/brand/blc', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/brand/mtn', table: 'tableOffline', type: 'date', wherePos: 'end' },
  { path: '/api/data-quality', table: 'both', wherePos: 'end' }
];

// Instead of complex regexes, I'll modify the code manually or via more robust logic
