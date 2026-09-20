import test from 'node:test';
import assert from 'node:assert/strict';
import { BigQuerySourceAccess } from '../server/bigquery/sourceAccess';
import { getClientConfig } from '../server/bigquery/config';
import { RequestError } from '../server/bigquery/filters';
import { compileSourceMetrics } from '../server/bigquery/sourceMetrics';
test('shared-table source clients fail closed before a warehouse identity is used',()=>{
  const client=structuredClone(getClientConfig('default_tenant'));client.dataSourceMode='shared';
  assert.throws(()=>new BigQuerySourceAccess(client),error=>error instanceof RequestError&&error.status===503);
});
test('date-bound source queries never assign missing timestamps to a selected period',()=>{
  const compiled=compileSourceMetrics('timeToDial',{clientId:'default_tenant',startDate:'2026-08-01',endDate:'2026-08-31',filters:{}},{schema:{fields:[{name:'expected_first_dial',type:'STRING'}]}});
  assert.match(compiled.query,/SAFE_CAST/);assert.match(compiled.query,/BETWEEN @startDate AND @endDate/);
  assert.doesNotMatch(compiled.query,/COALESCE.*CURRENT_DATE/);
});
