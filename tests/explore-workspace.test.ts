import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DEFAULT_VIEW, DIMENSIONS, readExploreView, writeExploreView, resetExploreView, validateView, normalizeResponse, safeChart, canDonut, sumExact, selectRows, formatValue, seriesNames, pivotSeries, donutRows, exportCsv } from '../src/lib/explore/model';
const request={clientId:'default_tenant',metric:'leads',dimension:'source'};
const response=(rows:any[],metadata:any={})=>normalizeResponse({success:true,data:rows,metadata},request);
const row=(name:string|null,value:unknown,sample:unknown=10)=>({dim1:name,value,sampleSize:sample,fullFunnel:{leads:sample}});

test('Explore defaults and page-specific parameters leave scope intact',()=>{
  assert.deepEqual(readExploreView(new URLSearchParams()),DEFAULT_VIEW);
  const p=writeExploreView(new URLSearchParams('vendor=MTN&filters=%7B%7D'),{...DEFAULT_VIEW,metric:'sale_rate'}, {startDate:'2026-08-01',endDate:'2026-08-31'});
  assert.equal(p.get('vendor'),'MTN');assert.equal(p.get('startDate'),'2026-08-01');assert.equal(readExploreView(p).metric,'sale_rate');
});
test('repeated and invalid view values fail closed',()=>{
  for(const query of ['exMetric=leads&exMetric=sales','exMetric=unknown','exDimension=vendor','exSecondary=source','exChart=invalid'])assert.throws(()=>readExploreView(new URLSearchParams(query)));
});
test('dimension list exposes class and vetting, never unsupported vendor grouping',()=>{
  assert.ok(DIMENSIONS.some(d=>d.id==='grade'));assert.ok(DIMENSIONS.some(d=>d.id==='vetting'));assert.ok(!DIMENSIONS.some(d=>d.id==='vendor'));
});
test('reset removes only Explore settings, not user dates or filters',()=>{
  const p=resetExploreView(new URLSearchParams('exMetric=sales&exChart=table&startDate=2026-08-01&vendor=MTN'));
  assert.equal(p.get('startDate'),'2026-08-01');assert.equal(p.get('vendor'),'MTN');assert.equal(p.has('exMetric'),false);
});
test('secondary dimension is allowed only when distinct and supported',()=>{
  assert.equal(validateView({...DEFAULT_VIEW,secondary:'grade'}).secondary,'grade');
  assert.throws(()=>validateView({...DEFAULT_VIEW,secondary:'source'}));assert.throws(()=>validateView({...DEFAULT_VIEW,secondary:'vendor'}));
});
test('missing arrays and failed responses do not become empty dashboards',()=>{
  for(const body of [{success:false,data:[]},{success:true},{success:true,data:{}},{success:true,data:[{}]}])assert.throws(()=>normalizeResponse(body,request));
});
test('response identity must match requested metric, dimension and tenant',()=>{
  for(const metadata of [{metric:'sales'},{dimension:'date'},{clientId:'other'},{secondaryDimension:'grade'}])assert.throws(()=>response([row('A',1)],metadata));
});
test('legacy nested response envelope is accepted explicitly',()=>{
  const r=normalizeResponse({success:true,data:{data:[row('A',1)],metadata:{metric:'leads'}}},request);assert.equal(r.rows[0].value,'1');
});
test('duplicate primary and secondary group keys are not combined',()=>{
  assert.throws(()=>response([row('A',1),row('A',3)]),/duplicate/);
  const r=normalizeResponse({success:true,data:[{...row('A',1),dim2:'X'},{...row('A',3),dim2:'Y'}]}, {...request,secondary:'grade'});assert.equal(r.rows.length,2);
});
test('missing secondary values fail instead of reverting silently to one dimension',()=>{
  assert.throws(()=>normalizeResponse({success:true,data:[row('A',1)]},{...request,secondary:'grade'}),/secondary/);
});
test('malformed or over-limit result arrays are rejected',()=>{
  assert.throws(()=>response(Array.from({length:1001},(_,i)=>row(String(i),1))));
  assert.throws(()=>response([{dim1:'A',value:1,sampleSize:-1}]));
});
test('null, blank and malformed metrics do not become zero',()=>{
  const r=response([row('Null',null),row('Zero',0),row('Blank',''),row('Bad','invalid')]);
  assert.deepEqual(r.rows.map(r=>r.value),[null,'0',null,null]);assert.equal(r.rows[3].precisionWarning,true);
});
test('exact decimal summation and sort retain values beyond JS safe integer size',()=>{
  const r=response([row('A','9007199254740992'),row('B','9007199254740993')]);
  assert.equal(sumExact(r.rows.map(r=>r.value)),'18014398509481985');assert.equal(selectRows(r.rows,'','value_desc','0')[0].dim1,'B');
});
test('sums preserve signed decimals and withhold incomplete totals',()=>{
  assert.equal(sumExact(['10.20','-1.003']),'9.197');assert.equal(sumExact(['0','0']),'0');assert.equal(sumExact(['10',null]),null);assert.equal(sumExact([]),null);
});
test('approximate numeric input is identified; exact strings are never relabelled approximate',()=>{
  assert.equal(response([row('A',9007199254740994)]).rows[0].precisionWarning,true);
  assert.equal(response([row('A','9007199254740994')]).rows[0].precisionWarning,false);
});
test('percentages keep received scale; zero and unavailable are distinct',()=>{
  assert.equal(formatValue('12.5','sale_rate'),'12.5%');assert.equal(formatValue('0','sale_rate'),'0%');assert.equal(formatValue(null,'sale_rate'),'Unavailable');
  assert.equal(formatValue('0.01','revenue','ZAR'),'ZAR 0.01');
});
test('missing metrics sort last in either direction',()=>{
  const r=response([row('Missing',null),row('A',2),row('B',0)]);
  for(const sort of ['value_asc','value_desc'] as const)assert.equal(selectRows(r.rows,'',sort,'0').at(-1)!.dim1,'Missing');
});
test('local search and sample threshold do not mutate received groups',()=>{
  const r=response([row('Alpha',2,5),row('Beta',3,100),row('BETA low',0,0)]);
  assert.deepEqual(selectRows(r.rows,'beta','sample_desc','10').map(r=>r.dim1),['Beta']);assert.equal(r.rows.length,3);assert.equal(sumExact(r.rows.map(r=>r.value)),'5');
});
test('unknown sample sizes are excluded only when a positive sample minimum is requested',()=>{
  const r=response([row('Missing',2,null),row('Zero',0,0)]);
  assert.equal(selectRows(r.rows,'','label','0').length,2);assert.equal(selectRows(r.rows,'','label','1').length,0);
});
test('time charts cannot connect unordered categories as a trend',()=>{
  assert.equal(safeChart({...DEFAULT_VIEW,chart:'line'}),'bar');assert.equal(safeChart({...DEFAULT_VIEW,dimension:'date',chart:'line'}),'line');
});
test('doughnut refuses ratios, money, comparison groups, missing or negative values',()=>{
  const rows=response([row('A',1),row('B',2)]).rows;
  assert.equal(canDonut(DEFAULT_VIEW,rows),true);
  for(const v of [{...DEFAULT_VIEW,metric:'sale_rate'},{...DEFAULT_VIEW,metric:'revenue'},{...DEFAULT_VIEW,secondary:'grade'},{...DEFAULT_VIEW,dimension:'date'}])assert.equal(canDonut(v,rows),false);
  assert.equal(canDonut(DEFAULT_VIEW,response([row('A',null)]).rows),false);assert.equal(canDonut(DEFAULT_VIEW,response([row('A',-1)]).rows),false);
});
test('zero-only doughnut is unavailable, not a fabricated slice',()=>{
  assert.equal(canDonut(DEFAULT_VIEW,response([row('A',0)]).rows),false);
});
test('Other combines only the explicitly remaining received count groups',()=>{
  const r=response([row('A','9007199254740993'),row('B',4),row('C',2)]);const p=donutRows(r.rows,1);
  assert.equal(p[1].value,'6');assert.match(p[1].label,/2 returned groups/);assert.equal(r.rows.length,3);
});
test('series pivots retain absent category cells as gaps',()=>{
  const r=normalizeResponse({success:true,data:[{...row('2026-08-01',1),dim2:'A'},{...row('2026-08-02',2),dim2:'B'}]},{...request,secondary:'grade'});
  const names=seriesNames(r.rows),pivot=pivotSeries(r.rows,names);assert.equal((pivot[0] as any).v0,1);assert.equal((pivot[0] as any).v1,null);
});
test('missing dimension identity does not collide with a literal display label',()=>{
  const r=normalizeResponse({success:true,data:[{...row(null,1),dim2:null},{...row('Unspecified',2),dim2:'Unspecified'}]},{...request,secondary:'grade'});
  assert.equal(seriesNames(r.rows).length,2);assert.equal(pivotSeries(r.rows,seriesNames(r.rows)).length,2);
});
test('CSV retains scope and exact values and protects spreadsheet formulas',()=>{
  const r=response([row('=SUM(A1)','9007199254740993')]);const csv=exportCsv(r.rows,DEFAULT_VIEW,{startDate:'2026-08-01',truncated:true});
  assert.ok(csv.includes("'=SUM(A1)"));assert.ok(csv.includes('9007199254740993'));assert.ok(csv.includes('2026-08-01'));assert.ok(csv.includes('truncated'));
});
test('loaded CSV can include rows hidden by local search',()=>{
  const r=response([row('Alpha',1),row('Beta',2)]);const matching=selectRows(r.rows,'Alpha','label','0');assert.ok(exportCsv(r.rows,DEFAULT_VIEW,{}).includes('Beta'));assert.ok(!exportCsv(matching,DEFAULT_VIEW,{}).includes('Beta'));
});
test('query cache excludes presentation controls and consumes the cancellation signal',()=>{
  const s=fs.readFileSync('src/lib/explore/useExploreData.ts','utf8');assert.match(s,/fetchAnalyticsJson\(analyticsUrl\('explore'.*\),signal\)/);assert.match(s,/secondaryDimension:view.secondary/);assert.match(s,/cancelQueries/);
  assert.match(s,/available=ready&&!!scope.clientId&&!selectionError/);assert.match(s,/status===401&&!signal.aborted/);
  const r=s.slice(s.indexOf('const request='),s.indexOf('const query='));assert.doesNotMatch(r,/view\.chart|search|sort|minSample/);
});
test('new table remains integrated with shared visuals and default table-only mode',()=>{
  const s=fs.readFileSync('src/components/explore/ExploreResults.tsx','utf8');assert.match(s,/VisualTable initialView="table"/);assert.match(s,/slice\(pageIndex\*pageSize/);
});

test('invalid structured or non-finite group identities cannot masquerade as missing labels',()=>{
  for(const dim1 of [{unknown:'x'},['A'],true,Infinity])assert.throws(()=>response([{...row('A',1),dim1}]));
});
test('negative decimal ordering uses received values rather than rounding',()=>{
  const r=response([row('A','-0.0000000000000002'),row('B','-0.0000000000000001')]);
  assert.equal(selectRows(r.rows,'','value_desc','0')[0].dim1,'B');
});
test('truncation evidence remains explicit in the normalized response',()=>{
  const r=response([row('A',3)],{truncated:true});assert.equal(r.metadata.truncated,true);
});
