import { ENGINE_HASH } from '../server/reporting/buildStamp';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { FACTS, METRICS, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest, type ReportRequest } from '../contracts/reporting';
import { exactNumber } from '../contracts/format';
import { validateRelease, metricAvailability, REQUIRED_CHECKS } from '../server/reporting/release';
import { reportRequest, isoTimestamp } from '../server/reporting/scope';
import { ExecutionSigner, digest } from '../server/reporting/execution';
import { compileReport, compileEvidence } from '../server/reporting/query';
import { releaseCheckQueries } from '../server/reporting/checks';
import { ReportService } from '../server/reporting/service';
import { entityKey, normalizeBatch } from '../server/reporting/ingestion';
const cutoff='2026-09-20T00:00:00.000Z';
const snapshots=Object.fromEntries(FACTS.map(f=>[f,{table:`project.cx_reporting.rtest01_${f}`,createdAt:cutoff,snapshotTime:cutoff}])) as ReleaseManifest['snapshots'];
const provenance=Object.fromEntries(['records','batches','contracts'].map(f=>[f,{table:`project.cx_reporting.rtest01_${f}`,createdAt:cutoff,snapshotTime:cutoff}])) as ReleaseManifest['provenance'];
const release:ReleaseManifest={releaseId:'rtest01',tenantId:'default_tenant',modelVersion:MODEL_VERSION,metricVersion:METRIC_VERSION,engineHash:ENGINE_HASH,status:'PUBLISHED',builtAt:cutoff,cutoff,
  sourceBatchIds:['fixture-batch'],snapshots,provenance,sources:FACTS.map(f=>({fact:f,status:'COMPLETE',contractVersion:'fixture-1',completeThrough:cutoff,earliestAvailable:'2026-01-01T00:00:00.000Z',owner:'fixture-owner',approvalReference:'test-only-not-a-production-approval'})),
  checks:REQUIRED_CHECKS.map(id=>({id,status:'PASS',expected:'0',observed:'0',jobId:'fixture-job'})),approvedBy:'fixture-owner',approvalReference:'synthetic-fixture'};
const req:ReportRequest={tenantId:'default_tenant',startDate:'2026-08-01',endDate:'2026-08-31',observationCutoff:cutoff,dateBasis:'capture_cohort',grouping:'none',currency:'ZAR',metrics:METRICS.map(m=>m.id),filters:{}};
const person={subject:'test-user',email:'test@example.com',tenants:['default_tenant'],role:'viewer' as const};
const clone=<T,>(x:T):T=>JSON.parse(JSON.stringify(x));
const signer=new ExecutionSigner('test-only-signing-key-never-production-000000');
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/reporting-reference.json','utf8'));
// The fixture expected values are handwritten. This oracle is independent of the production SQL compiler.
function reference(vendor?:string,source?:string){
  const leads=fixture.leads.filter((l:any)=>!source||l.source===source);
  const deliveries=fixture.deliveries.filter((d:any)=>leads.some((l:any)=>l.entity_key===d.lead_key)&&(!vendor||d.vendor===vendor));
  const selectedLeads=vendor?leads.filter((l:any)=>deliveries.some((d:any)=>d.lead_key===l.entity_key)):leads;
  const delivered=deliveries.filter((d:any)=>d.delivered_at);
  const calls=fixture.calls.filter((c:any)=>deliveries.some((d:any)=>d.entity_key===c.delivery_key));
  const called=delivered.filter((d:any)=>calls.some((c:any)=>c.delivery_key===d.entity_key&&Date.parse(c.event_at)>=Date.parse(d.delivered_at)));
  const sales=fixture.sales.filter((s:any)=>deliveries.some((d:any)=>d.entity_key===s.delivery_key));
  const activations=fixture.activations.filter((a:any)=>sales.some((s:any)=>s.entity_key===a.sale_key));
  const activatedSales=sales.filter((s:any)=>activations.some((a:any)=>a.sale_key===s.entity_key));
  const result:any={fetched_leads:String(selectedLeads.length),delivered_episodes:String(delivered.length),call_attempts:String(calls.length),called_episodes:String(called.length),
    call_coverage:delivered.length?String(100*called.length/delivered.length):null,sale_events:String(sales.length),activation_events:String(activations.length),sale_activation_rate:sales.length?String(100*activatedSales.length/sales.length):null};
  for(const stage of ['expected','approved','invoiced','collected']){
    let cents=0n;
    for(const f of fixture.commercial.filter((f:any)=>f.currency==='ZAR'&&f.stage===stage&&sales.some((s:any)=>s.entity_key===f.sale_key))){
      const [whole,part='']=f.amount_delta.replace('-','').split('.');cents+=(BigInt(whole)*100n+BigInt(part.padEnd(2,'0')))*(f.amount_delta.startsWith('-')?-1n:1n);
    }
    result[stage+'_value']=cents%100n===0n?String(cents/100n):`${cents/100n}.${String(cents%100n).padStart(2,'0')}`;
  }return result;
}
for(const [name,vendor,source]of [['all',undefined,undefined],['vendorA','Vendor A',undefined],['vendorB','Vendor B',undefined],['organic',undefined,'Organic']] as const)test(`independent fixture: ${name}`,()=>assert.deepEqual(reference(vendor,source),fixture.expected[name]));
test('registry IDs unique and every monetary stage separate',()=>{assert.equal(new Set(METRICS.map(m=>m.id)).size,METRICS.length);assert.equal(METRICS.filter(m=>m.unit==='currency').length,4);});
test('strict scope rejects unknown parameters',()=>assert.throws(()=>reportRequest({...req,clientId:'other'})));
test('scope rejects prototype and SQL field names',()=>assert.throws(()=>reportRequest({...req,filters:JSON.parse('{"__proto__":["x"]}')})));
test('scope rejects oversized ranges',()=>assert.throws(()=>reportRequest({...req,endDate:'2028-01-01'})));
test('scope requires explicit timezone',()=>assert.throws(()=>isoTimestamp('2026-09-20 00:00:00','t')));
test('scope rejects non-existent calendar day',()=>assert.throws(()=>isoTimestamp('2026-02-30T00:00:00Z','t')));
test('scope rejects unknown metric',()=>assert.throws(()=>reportRequest({...req,metrics:['profit_guess']})));
test('stable scope canonicalises IN values',()=>assert.deepEqual(reportRequest({...req,filters:{vendor:['B','A','B']}}).filters.vendor,['A','B']));
test('release requires all independent checks',()=>{const r=clone(release);r.checks.pop();assert.throws(()=>validateRelease(r));});
test('a FAILED check cannot be overridden by approval',()=>{const r=clone(release);r.checks[0].status='FAIL';assert.throws(()=>validateRelease(r));});
test('duplicated checks cannot count as independent checks',()=>{const r=clone(release);r.checks.push(r.checks[0]);assert.throws(()=>validateRelease(r));});
test('release rejects matching status with differing measured result',()=>{const r=clone(release);r.checks[0].observed='1';assert.throws(()=>validateRelease(r));});
test('release requires raw source snapshots',()=>{const r=clone(release);delete (r as any).provenance;assert.throws(()=>validateRelease(r));});
test('release is model-version bound',()=>assert.throws(()=>validateRelease({...release,modelVersion:'unknown'})));
test('revoked release cannot be read',()=>assert.throws(()=>validateRelease({...release,status:'REVOKED'})));
test('unavailable call evidence does not turn into zero calls',()=>{const r=clone(release);r.sources.find(s=>s.fact==='calls')!.status='UNAVAILABLE';assert.equal(metricAvailability('call_attempts',req,r).available,false);assert.equal(metricAvailability('fetched_leads',req,r).available,true);});
test('incomplete source coverage blocks ratios but labels observed counts',()=>{const r=clone(release);r.sources.find(s=>s.fact==='calls')!.status='PARTIAL';assert.equal(metricAvailability('call_coverage',req,r).available,false);assert.equal(metricAvailability('call_attempts',req,r).completeness,'PARTIAL');});
test('old source watermark is incomplete even when status says complete',()=>{const r=clone(release);r.sources.find(s=>s.fact==='calls')!.completeThrough='2026-08-01T00:00:00.000Z';assert.equal(metricAvailability('call_coverage',req,r).available,false);});
test('event-date ratios are not silently misinterpreted',()=>assert.equal(metricAvailability('call_coverage',{...req,dateBasis:'event_date'},release).available,false));
test('vendor grouping cannot allocate overlapping leads to first vendor',()=>assert.equal(metricAvailability('fetched_leads',{...req,grouping:'vendor'},release).available,false));
test('report signature binds identity',()=>{const t=signer.create(person.subject,req,release);assert.throws(()=>signer.verify(t,'other-user'));});
test('report signature binds metric and filter payload',()=>{const t=signer.create(person.subject,req,release);const p=t.split('.');const payload=JSON.parse(Buffer.from(p[0],'base64url').toString());payload.request.filters.vendor=['other'];p[0]=Buffer.from(JSON.stringify(payload)).toString('base64url');assert.throws(()=>signer.verify(p.join('.'),person.subject));});
test('report token expiry is enforced',()=>{const earlier=new ExecutionSigner('test-only-signing-key-never-production-000000',()=>0);assert.throws(()=>signer.verify(earlier.create(person.subject,req,release),person.subject));});
test('report cutoff cannot exceed pinned knowledge window',()=>assert.throws(()=>signer.create(person.subject,{...req,observationCutoff:'2026-09-21T00:00:00Z'},release)));
test('exact formatting preserves integers beyond JS safe range',()=>assert.equal(exactNumber('9007199254740993'),'9,007,199,254,740,993'));
test('exact decimal formatting preserves sub-cent and negative deltas',()=>{assert.equal(exactNumber('0.290000000',2),'0.29');assert.equal(exactNumber('-0.000000001',2),'-0.000000001');assert.equal(exactNumber(null),'Unavailable');});
test('generated SQL binds filters and targets immutable release tables',()=>{const injection="Vendor A' OR TRUE --";const q=compileReport({...req,filters:{vendor:[injection]}},release)!;assert.ok(!q.query.includes(injection));assert.equal(q.params.vendor_0,injection);for(const s of Object.values(snapshots))assert.ok(q.query.includes(s.table));assert.ok(!q.query.includes('views.base'));});
test('call and sale populations cannot multiply each other',()=>{const q=compileReport(req,release)!;assert.match(q.query,/FROM c\n/);assert.doesNotMatch(q.query,/JOIN c.*JOIN s/);});
test('ratio query sums numerators and denominators',()=>assert.match(compileReport(req,release)!.query,/SAFE_DIVIDE\(SUM\(numerator\),SUM\(denominator\)\)/));
test('money values stay decimal strings',()=>{const q=compileReport(req,release)!;assert.match(q.query,/CAST\(COALESCE\(SUM\(numerator\),0\) AS STRING\)/);assert.doesNotMatch(q.query,/FLOAT64/);});
test('evidence and aggregates share identical population SQL',()=>{const q=compileReport(req,release)!,e=compileEvidence(req,release,'call_attempts',null);assert.equal(q.query.slice(0,q.query.indexOf('\nSELECT * FROM (')),e.query.slice(0,e.query.indexOf(' SELECT metric_id,')));});
test('evidence rejects metrics outside signed selection',()=>assert.throws(()=>compileEvidence({...req,metrics:['fetched_leads']},release,'call_attempts',null)));
test('independent checks include frozen raw facts, counts and joins',()=>{const checks=releaseCheckQueries(release);assert.deepEqual(Object.keys(checks).sort(),[...REQUIRED_CHECKS].sort());assert.ok(checks.raw_fact_counts.includes(provenance.records.table));assert.ok(checks.relationships.includes(snapshots.calls.table));assert.ok(checks.fact_uniqueness.includes('COUNT(*)>1'));});
const contract={tenant_id:'default_tenant',source_id:'source01',entity_kind:'calls' as const,contract_version:'v1',status:'APPROVED' as const,owner:'test',approval_reference:'fixture',record_semantics:'immutable_event' as const};
const record={source_record_id:'call01',revision:0,source_updated_at:'2026-08-01T00:00:00Z',payload:{delivery_key:entityKey('default_tenant','deliveries','source01','d1'),event_at:'2026-08-01T00:00:00Z'}};
test('source namespace participates in entity identity',()=>assert.notEqual(entityKey('default_tenant','leads','source01','1'),entityKey('default_tenant','leads','source02','1')));
test('cumulative call snapshots cannot masquerade as event records',()=>assert.throws(()=>normalizeBatch({...contract,record_semantics:'versioned_entity'},'batch',[record],cutoff)));
test('repeated records in the same batch are rejected, not doubled',()=>assert.throws(()=>normalizeBatch(contract,'batch',[record,record],cutoff)));
test('draft contracts never authorize imports',()=>assert.throws(()=>normalizeBatch({...contract,status:'DRAFT'},'batch',[record],cutoff)));
test('unresolved parent identifiers cannot be fuzzy-joined',()=>assert.throws(()=>normalizeBatch(contract,'batch',[{...record,payload:{...record.payload,delivery_key:'unresolved'}}],cutoff)));
test('immutable call revision cannot overwrite earlier evidence',()=>assert.throws(()=>normalizeBatch(contract,'batch',[{...record,revision:1}],cutoff)));
test('equivalent payload field order keeps hash stable',()=>{const a=normalizeBatch(contract,'batch',[record],cutoff)[0],b=normalizeBatch(contract,'batch',[{...record,payload:{event_at:record.payload.event_at,delivery_key:record.payload.delivery_key}}],cutoff)[0];assert.equal(a.payload_hash,b.payload_hash);});
test('service rejects unmeasured or missing aggregates, not zero substitutes',async()=>{
  const repo:any={configured:true,release:async()=>release,assertSnapshots:async()=>{},query:async()=>({rows:[],jobId:'test'})};
  await assert.rejects(new ReportService(repo,signer).create(req,person),/Missing or duplicated aggregate/);
});
test('permission changes invalidate previously signed executions',async()=>{
  const token=signer.create(person.subject,req,release);const repo:any={configured:true,release:async()=>{throw new Error('must not query');}};
  await assert.rejects(new ReportService(repo,signer).run(token,{...person,tenants:[]}),/Tenant access denied/);
});
test('mutated release manifests cannot silently alter a signed report',async()=>{
  const token=signer.create(person.subject,req,release);const repo:any={configured:true,release:async()=>({...release,sourceBatchIds:['changed-batch']}),assertSnapshots:async()=>{throw new Error('must not execute');}};
  await assert.rejects(new ReportService(repo,signer).run(token,person),/Release metadata changed/);
});
test('report execution hash is stable under object-key order',()=>assert.equal(digest({scope:req,release}),digest({release,scope:req})));
