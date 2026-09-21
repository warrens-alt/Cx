import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { classLabel, colourLabel, countRatio, periodChange, COUNT_KEYS, VETTING_SECTIONS, MISSING_CLASS, MISSING_COLOUR, UNMAPPED_COLOUR, MULTIPLE_COLOURS, type VettingCounts, type VettingMetric, type VettingReport } from '../contracts/vetting';
import { compileVetting, vettingScope } from '../server/vetting/query';
import { getVettingReport, validateVettingResult } from '../server/vetting/service';
import { createVettingRouter } from '../server/vetting/router';
import type { TableMetadata, SourceAccess } from '../server/bigquery/sourceAccess';
import { classMovement, csvText, groupDataset } from '../src/lib/vetting';
const scope={clientId:'default_tenant',startDate:'2026-08-01',endDate:'2026-08-31',filters:{}};
const fields=['lead_id','fetched','offershop_source','offernet_medium','offershop_grade','offershop_color_vetting','offershop_grade_date','offershop_color_vetting_date','valid_lead','valid_idno','phone_valid'];
export const metadata:TableMetadata={schema:{fields:[...fields.map(name=>({name,type:'STRING'})),{name:'hlc_details',type:'RECORD',mode:'REPEATED',fields:['vendor','delivered','first_call_date','rpc','sale','activated'].map(name=>({name,type:'STRING'}))}]}};
const aggregate=(leads='8'):VettingCounts=>({...Object.fromEntries(COUNT_KEYS.map(k=>[k,k==='leads'?leads:'0'])) as Record<VettingMetric,string|null>,classMeanSeconds:null,colourMeanSeconds:null});
function result(){
  const current=aggregate(),previous=aggregate('4');
  const groups=['current','previous'].flatMap(period=>VETTING_SECTIONS.map(section=>({...structuredClone(period==='current'?current:previous),period,section,key:section.startsWith('trend')?'2026-08-01':'A',series:''})));
  return {current,previous,groups,diagnostics:[{period:'current',sourceRows:'10',missingIdRows:'1',conflictingLeads:'0',conflictingRows:'0',duplicateRowsCollapsed:'1',eligibleUniqueLeads:'8'},
    {period:'previous',sourceRows:'4',missingIdRows:'0',conflictingLeads:'0',conflictingRows:'0',duplicateRowsCollapsed:'0',eligibleUniqueLeads:'4'}],timing:[],generatedAt:'2026-09-21T10:00:00Z'};
}
const fake=(rows:any[]= [result()]):SourceAccess=>({metadata:async()=>metadata,listTables:async()=>[],execute:async()=>({rows,jobId:'fixture-vetting-job',referencedTables:['fixture.ledger.leads'],bytesProcessed:'100'})});

test('class codes retain U and do not convert status text into a class',()=>{
  assert.equal(classLabel('Class A'),'A');assert.equal(classLabel(' class_b '),'B');assert.equal(classLabel('u'),'U');
  assert.equal(classLabel('Approved - A'),'Approved - A');assert.equal(classLabel('L'),'L');assert.equal(classLabel(''),MISSING_CLASS);
});
test('named colours require an exact first token, not a keyword somewhere in status text',()=>{
  assert.equal(colourLabel('Green, additional result'),'Green');assert.equal(colourLabel('  blue '),'Blue');
  assert.equal(colourLabel('Contract failed vetting'),UNMAPPED_COLOUR);assert.equal(colourLabel('Not Green'),UNMAPPED_COLOUR);assert.equal(colourLabel('Failed, Green'),UNMAPPED_COLOUR);
});
test('missing and ambiguous colour results are distinct categories',()=>{
  assert.equal(colourLabel(null),MISSING_COLOUR);assert.equal(colourLabel(''),MISSING_COLOUR);assert.equal(colourLabel('Green,Blue'),MULTIPLE_COLOURS);assert.equal(colourLabel('Green,Green'),'Green');assert.equal(colourLabel('Existing'),UNMAPPED_COLOUR);
});
test('class and colour labels never impose pass fail qualification or rate cards',()=>{
  const q=compileVetting(scope,metadata).query;assert.match(q,/offershop_grade/);assert.match(q,/offershop_color_vetting/);
  assert.doesNotMatch(q,/expected_ontact_revenue|revenue_generated|premium|billable/i);
});
test('percent ratios preserve zero, missing and large integers without double-scaling',()=>{
  assert.equal(countRatio('1','8'),'12.50');assert.equal(countRatio('0','8'),'0.00');assert.equal(countRatio(null,'8'),null);assert.equal(countRatio('1','0'),null);
  assert.equal(countRatio('9007199254740993','18014398509481986'),'50.00');assert.equal(countRatio('1','3'),'33.33');assert.equal(countRatio('2','3'),'66.67');
});
test('negative period movements remain negative; no prior denominator is not zero change',()=>{
  assert.deepEqual(periodChange('4','8'),{delta:'-4',percent:'-50.00'});assert.deepEqual(periodChange('4','0'),{delta:'4',percent:null});
});
test('previous reporting window is equal in length and immediately preceding',()=>{
  const s=vettingScope(scope);assert.equal(s.days,31);assert.equal(s.previousStart,'2026-07-01');assert.equal(s.previousEnd,'2026-07-31');
});
test('vetting dates and trend intervals reject invalid choices before querying',()=>{
  for(const bad of [{...scope,startDate:'2026-02-30'},{...scope,endDate:'2026-07-31'},{...scope,startDate:'2020-01-01'},{...scope,interval:'week); DROP'}])assert.throws(()=>compileVetting(bad,metadata));
});
test('query binds all class, colour and source values instead of interpolating them',()=>{
  const attack="Green' OR TRUE --";const c=compileVetting({...scope,classValue:'A',colourValue:attack,filters:{source:{operator:'in',values:['Synthetic Source']}}},metadata);
  assert.equal(c.params.colourValue,attack);assert.ok(!c.query.includes(attack));assert.match(c.query,/class_name = @classValue/);assert.match(c.query,/source IN \(@vetting_source_0\)/);
});
test('class-prefix whitespace survives JavaScript SQL construction',()=>{
  assert.ok(compileVetting(scope,metadata).query.includes('class[\\s_-]*'));
});
test('vendor filter is applied to the HLC records before positive outcome evaluation',()=>{
  const c=compileVetting({...scope,filters:{vendor:{operator:'in',values:['Vendor A']}}},metadata);
  assert.equal(c.params.vetting_vendor_0,'Vendor A');assert.match(c.query,/UNNEST\(all_hlc\) h WHERE h.vendor IN \(@vetting_vendor_0\)/);
  assert.match(c.query,/UNNEST\(selected_hlc\) h WHERE/);assert.doesNotMatch(c.query,/JOIN.*vicidial|JOIN.*activations/i);
});
test('vendor breakdowns re-evaluate outcomes on that vendor only',()=>{
  const q=compileVetting(scope,metadata).query;assert.match(q,/h.vendor=v AND/);assert.match(q,/vendorClass/);assert.match(q,/vendorColour/);assert.match(q,/SELECT DISTINCT h.vendor/);
});
test('HLC sale evidence does not fabricate RPC or first-call evidence',()=>{
  const q=compileVetting(scope,metadata).query;assert.match(q,/LOWER\(h.rpc\)='true' OR SAFE_CAST\(h.rpc AS NUMERIC\)>0/);assert.doesNotMatch(q,/total_calls|COALESCE\(.*sale.*first_call/);
});
test('source projections must be unambiguous before any selected-lead aggregation',()=>{
  const q=compileVetting(scope,metadata).query;assert.match(q,/COUNT\(DISTINCT signature\) OVER\(PARTITION BY lead_id\)/);assert.match(q,/variants=1 AND duplicate_rank=1/);assert.ok(q.indexOf('unique_leads AS')<q.indexOf('filtered AS'));
});
test('missing colour and class columns are absent from SQL while availability is explicit',()=>{
  const meta=structuredClone(metadata);meta.schema!.fields=meta.schema!.fields!.filter(f=>!['offershop_grade','offershop_color_vetting'].includes(f.name));
  const c=compileVetting(scope,meta);assert.equal(c.fields.leadClass.available,false);assert.equal(c.fields.leadColour.available,false);assert.doesNotMatch(c.query,/s\.`offershop_grade`|s\.`offershop_color_vetting`/);assert.match(c.query,/CAST\(NULL AS STRING\) AS classRecorded/);
});
test('a missing HLC field stays unavailable rather than becoming a false outcome',()=>{
  const meta=structuredClone(metadata);meta.schema!.fields!.find(f=>f.name==='hlc_details')!.fields=metadata.schema!.fields!.find(f=>f.name==='hlc_details')!.fields!.filter(f=>f.name!=='sale');
  const c=compileVetting(scope,meta);assert.equal(c.fields['hlc.sale'].available,false);assert.match(c.query,/CAST\(NULL AS STRING\) AS sales/);
});
test('unsupported advanced filters and unavailable class filters are rejected',()=>{
  assert.throws(()=>compileVetting({...scope,filters:{calls:{operator:'equals',value:1}}},metadata),/no verified calls mapping/);
  const meta=structuredClone(metadata);meta.schema!.fields=meta.schema!.fields!.filter(f=>f.name!=='offershop_grade');
  assert.throws(()=>compileVetting({...scope,classValue:'A'},meta),/Class mapping unavailable/);
});
test('boolean false source-validity filters are bound without dropping them',()=>{
  const c=compileVetting({...scope,filters:{phone_valid:{operator:'equals',value:false}}},metadata);assert.equal(c.params.vetting_phone_valid,false);assert.match(c.query,/valid_phone = @vetting_phone_valid/);
});
test('timing uses observed grading dates, seconds, safe chronology and exact percentiles',()=>{
  const q=compileVetting(scope,metadata).query;assert.match(q,/class_ts BETWEEN capture_ts AND CURRENT_TIMESTAMP/);assert.match(q,/TIMESTAMP_DIFF\(class_ts,capture_ts,SECOND\)/);assert.match(q,/PERCENTILE_CONT/);assert.doesNotMatch(q,/APPROX_QUANTILES/);
});
test('weekly and monthly grouping have explicit calendar boundaries',()=>{
  assert.match(compileVetting({...scope,interval:'week'},metadata).query,/DATE_TRUNC\(capture_date, WEEK\(MONDAY\)\)/);
  assert.match(compileVetting({...scope,interval:'month'},metadata).query,/DATE_TRUNC\(capture_date, MONTH\)/);
});
test('all returned aggregate sections reconcile to the same included-lead population',()=>{
  const r=validateVettingResult(result());assert.equal(r.current.leads,'8');assert.equal(r.previous.leads,'4');assert.equal(r.groups.length,VETTING_SECTIONS.length*2);
});
test('missing groups cannot silently produce a pie different from the headline',()=>{
  const r=result();r.groups=r.groups.filter(g=>!(g.section==='colour'&&g.period==='current'));assert.throws(()=>validateVettingResult(r),/does not reconcile/);
});
test('changed group counts, duplicate groups and mismatched field availability are rejected',()=>{
  const r=result();r.groups[0].leads='7';assert.throws(()=>validateVettingResult(r),/does not reconcile/);
  const duplicate=result();duplicate.groups.push({...duplicate.groups[0]});assert.throws(()=>validateVettingResult(duplicate),/Duplicated/);
});
test('missing query result does not become an empty dashboard',async()=>{
  await assert.rejects(getVettingReport(scope,fake([])),/one complete vetting response/);
});
test('numeric JSON values are rejected where exact source strings are required',()=>{
  const r:any=result();r.current.leads=9007199254740993;assert.throws(()=>validateVettingResult(r),/precision/);
});
test('source diagnostics reconcile exclusions separately from filtered results',()=>{
  const r=result();r.diagnostics[0].missingIdRows='2';assert.throws(()=>validateVettingResult(r),/exclusions do not reconcile/);
});
test('empty periods are explicit measured zero, not missing query responses',()=>{
  const r=result();r.current=aggregate('0');r.previous=aggregate('0');r.groups=[];r.diagnostics=r.diagnostics.map(d=>({...d,sourceRows:'0',missingIdRows:'0',duplicateRowsCollapsed:'0',eligibleUniqueLeads:'0'}));
  assert.equal(validateVettingResult(r).current.leads,'0');
});
test('excessive group responses are rejected instead of truncating analytical totals',()=>{
  const r=result();r.groups=Array(10001).fill(r.groups[0]);assert.throws(()=>validateVettingResult(r),/Too many/);
});
test('executed API response retains source-job and scope evidence',async()=>{
  let executions=0;const access=fake();const execute=access.execute;access.execute=async opts=>{executions++;return execute(opts);};
  const r=await getVettingReport(scope,access);assert.equal(executions,1);assert.equal(r.evidence.jobId,'fixture-vetting-job');assert.equal(r.evidence.snapshotPinned,false);assert.equal(r.scope.previousStart,'2026-07-01');
});
test('display adapters preserve exact numerators and do not recompute a new lead population',async()=>{
  const r=await getVettingReport(scope,fake());const groups=r.groups.filter(g=>g.period==='current'&&g.section==='class');
  const d=groupDataset(groups,r,'Class');assert.equal(d.rows[0].leads,'8');assert.equal(d.rows[0].share,'100.00');assert.equal(d.rows[0].saleShare,'0.00');
  assert.equal(classMovement(r,'class')[0].delta,'4');
});
test('CSV prevents spreadsheet formulas but preserves numeric precision',()=>{
  const csv=csvText(['Class','Leads'],[['=command','9007199254740993'],['A','-2']]);assert.ok(csv.includes("'=command"));assert.ok(csv.includes('9007199254740993'));assert.ok(csv.includes('"-2"'));
});

test('diagnostic output order is not assumed and duplicate periods are rejected',()=>{
  const source=result();source.diagnostics.reverse();
  assert.equal(validateVettingResult(source).diagnostics[0].period,'current');
  source.diagnostics[1]=source.diagnostics[0];
  assert.throws(()=>validateVettingResult(source),/diagnostic period/);
});

test('HTTP tenant and input validation protect the read-only vetting route',async()=>{
  const app=express();let calls=0;const access=fake();
  app.use((req,res,next)=>{if(req.get('x-fixture-role'))res.locals.principal={subject:'fixture',role:'viewer',tenants:['default_tenant']};next();});
  app.use('/api/analytics',createVettingRouter(()=>{calls++;return access;}));
  app.use((e:any,_q:any,r:any,_n:any)=>r.status(e.status||500).json({success:false,error:e.message}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const root=`http://127.0.0.1:${(server.address() as any).port}/api/analytics/vetting`;
  const params=new URLSearchParams({clientId:scope.clientId,startDate:scope.startDate,endDate:scope.endDate});
  try{
    assert.equal((await fetch(root+'?'+params)).status,401);assert.equal(calls,0);
    const good=await fetch(root+'?'+params,{headers:{'x-fixture-role':'viewer'}});assert.equal(good.status,200);const body=await good.json();assert.equal(body.data.current.leads,'8');
    assert.equal((await fetch(root+'?'+params+'&interval=day&interval=week',{headers:{'x-fixture-role':'viewer'}})).status,400);
    assert.equal((await fetch(root+'?'+params+'&unknown=1',{headers:{'x-fixture-role':'viewer'}})).status,400);
    const denied=await fetch(root+'?clientId=other&startDate=2026-08-01&endDate=2026-08-31',{headers:{'x-fixture-role':'viewer'}});assert.equal(denied.status,404);
  }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
