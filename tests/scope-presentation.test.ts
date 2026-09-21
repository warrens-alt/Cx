import test from 'node:test';
import assert from 'node:assert/strict';
import { filterDescription, filterLabel } from '../src/lib/scopePresentation';
import { readLegacyScope, writeLegacyFilter } from '../src/lib/legacyScope';

test('applied scope distinguishes false and zero without exposing private record identifiers',()=>{
  assert.equal(filterDescription('valid_idno',{operator:'equals',value:false}),'Recorded no');
  assert.equal(filterDescription('calls',{operator:'equals',value:0}),'0');
  assert.equal(filterDescription('lead_id',{operator:'in',values:['private-customer-id']}),'Private selection · this session only');
  assert.equal(filterDescription('consumer_id',{operator:'in',values:['private-consumer-id']}),'Private selection · this session only');
  assert.equal(filterLabel('vendor'),'Vendor');
});
test('sensitive record scopes fail closed when supplied through shared URLs',()=>{
  const params=new URLSearchParams({filters:JSON.stringify({lead_id:{operator:'in',values:['private-customer-id']}})});
  assert.throws(()=>readLegacyScope(params),/Private record selections cannot be restored/);
  assert.throws(()=>writeLegacyFilter(new URLSearchParams(),'lead_id',{operator:'in',values:['private-customer-id']}),/session memory/);
  assert.throws(()=>readLegacyScope(new URLSearchParams({filters:JSON.stringify({consumer_id:{operator:'in',values:[42]}})})),/Private record selections cannot be restored/);
});
test('multiple selected categories retain exact values and meaningful applied labels',()=>{
  const condition={operator:'in' as const,values:['Vendor A','Vendor B']};
  const params=writeLegacyFilter(new URLSearchParams(),'vendor',condition);
  assert.deepEqual(readLegacyScope(params).filters.vendor,condition);
  assert.equal(filterDescription('vendor',condition),'Vendor A, Vendor B');
});
