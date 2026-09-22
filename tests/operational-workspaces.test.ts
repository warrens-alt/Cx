import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exceptionCatalogue } from '../contracts/operations';
import { resolveVendorAgreement, type VendorAgreement } from '../contracts/commercial';
import { SAVED_ANALYSIS_VERSION, validateSavedAnalysisRelease, type SavedAnalysisDefinition } from '../contracts/savedAnalysis';
import { addExactDecimals, exactPercent, subtractExactDecimals } from '../contracts/exactDecimal';
import { exactMovement, pivotReportGroups, previousComparablePeriod, previousMatchedDays } from '../src/lib/evidenceWorkspace';
import { compileEvidence } from '../server/reporting/query';
import { FACTS, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest, type ReportResult } from '../contracts/reporting';
import { ENGINE_HASH } from '../server/reporting/buildStamp';

const cutoff='2026-09-20T00:00:00.000Z';
const snapshot=(fact:string)=>({table:`project.dataset.${fact}`,createdAt:cutoff,snapshotTime:cutoff});
const release:ReleaseManifest={releaseId:'rworkspace',tenantId:'default_tenant',modelVersion:MODEL_VERSION,metricVersion:METRIC_VERSION,engineHash:ENGINE_HASH,status:'PUBLISHED',builtAt:cutoff,cutoff,sourceBatchIds:['batch'],
  snapshots:Object.fromEntries(FACTS.map(f=>[f,snapshot(f)])) as any,provenance:{records:snapshot('records'),batches:snapshot('batches'),contracts:snapshot('contracts')},
  sources:FACTS.map(f=>({fact:f,status:'COMPLETE',contractVersion:'fixture',completeThrough:cutoff,earliestAvailable:'2026-01-01T00:00:00Z',owner:'test',approvalReference:'fixture'})),
  checks:[{id:'relationships',status:'PASS',observed:'0',expected:'0',jobId:'job'}],approvedBy:'test',approvalReference:'fixture'};

test('exception catalogue publishes release checks but never fabricates configured rule counts',()=>{
  const rules=exceptionCatalogue(release.sources,release.checks);
  assert.equal(rules.find(rule=>rule.id==='identifier_mismatch')?.count,'0');
  assert.equal(rules.find(rule=>rule.id==='reporting_coverage_degraded')?.count,'0');
  const sla=rules.find(rule=>rule.id==='delivered_not_dialled_sla')!;
  assert.equal(sla.status,'CONFIGURATION_REQUIRED');assert.equal(sla.count,null);assert.match(sla.reason!,/approved.*SLA/i);
  const missing=release.sources.map(source=>source.fact==='calls'?{...source,status:'UNAVAILABLE' as const}:source);
  assert.equal(exceptionCatalogue(missing,release.checks).find(rule=>rule.id==='missing_disposition')?.status,'SOURCE_UNAVAILABLE');
});

test('commercial agreement selection is effective-date deterministic and rejects overlap',()=>{
  const agreement:VendorAgreement={agreementId:'a1',version:'v1',vendor:'Vendor A',currency:'ZAR',effectiveFrom:'2026-07-01',effectiveThrough:'2026-07-31',eligibleEvent:'sale',unitRate:'123.4500',approvalReference:'approved'};
  assert.equal(resolveVendorAgreement([agreement],{vendor:'Vendor A',currency:'ZAR',eventDate:'2026-07-10',eligibleEvent:'sale'})?.version,'v1');
  assert.equal(resolveVendorAgreement([agreement],{vendor:'Vendor A',currency:'ZAR',eventDate:'2026-08-01',eligibleEvent:'sale'}),null);
  assert.throws(()=>resolveVendorAgreement([agreement,{...agreement,agreementId:'a2',version:'v2'}],{vendor:'Vendor A',currency:'ZAR',eventDate:'2026-07-10',eligibleEvent:'sale'}),/Overlapping/);
});
test('commercial agreements reject normalized but non-existent calendar dates',()=>{
  const agreement={agreementId:'a',version:'1',vendor:'V',currency:'ZAR',effectiveFrom:'2026-02-30',effectiveThrough:null,eligibleEvent:'sale' as const,unitRate:'1',approvalReference:'test'};
  assert.throws(()=>resolveVendorAgreement([agreement],{vendor:'V',currency:'ZAR',eventDate:'2026-03-01',eligibleEvent:'sale'}),/Invalid agreement effective date/);
});

test('saved analysis contract distinguishes pinned releases from current views',()=>{
  const base:SavedAnalysisDefinition={version:SAVED_ANALYSIS_VERSION,id:'one',name:'Weekly vendors',ownerSubject:'user',report:'vendor_performance',scope:{tenantId:'default_tenant',startDate:'2026-07-01',endDate:'2026-07-31',dateBasis:'capture_cohort',grouping:'vendor',filters:{}},metrics:['delivered_episodes'],presentation:{},release:{mode:'pinned_release',releaseId:'rworkspace'}};
  assert.doesNotThrow(()=>validateSavedAnalysisRelease(base));
  assert.throws(()=>validateSavedAnalysisRelease({...base,release:{mode:'pinned_release',releaseId:null}}),/immutable release ID/);
  assert.throws(()=>validateSavedAnalysisRelease({...base,release:{mode:'current_observations',releaseId:'rworkspace'}}),/cannot carry/);
});

test('period comparisons use inclusive days and cap matched days to the previous month',()=>{
  assert.deepEqual(previousComparablePeriod('2026-07-01','2026-07-31'),{startDate:'2026-05-31',endDate:'2026-06-30'});
  assert.deepEqual(previousMatchedDays('2026-07-01','2026-07-31'),{startDate:'2026-06-01',endDate:'2026-06-30'});
  assert.deepEqual(previousMatchedDays('2024-03-01','2024-03-15'),{startDate:'2024-02-01',endDate:'2024-02-15'});
});

test('workspace exact calculations retain high precision and unavailable comparisons',()=>{
  assert.equal(addExactDecimals('9007199254740993.0001','0.0099'),'9007199254740993.01');
  assert.equal(subtractExactDecimals('100.01','0.29'),'99.72');
  assert.equal(exactPercent('1','3',6),'33.333333');
  assert.equal(exactMovement('110','100',1),'10.0');
  assert.equal(exactMovement('0','0',1),null);
});

test('vendor rows pivot exact metric results without summing overlapping groups',()=>{
  const report={groups:[{metricId:'delivered_episodes',group:'Vendor A',value:'9007199254740993',numerator:'9007199254740993',denominator:null,unit:'records',calculationStatus:'CHECKED',completeness:'COMPLETE',reason:null},{metricId:'call_coverage',group:'Vendor A',value:null,numerator:null,denominator:null,unit:'percent',calculationStatus:'UNAVAILABLE',completeness:'PARTIAL',reason:'Incomplete'}]} as unknown as ReportResult;
  const rows=pivotReportGroups(report);assert.equal(rows.length,1);assert.equal(rows[0].metrics.delivered_episodes.value,'9007199254740993');assert.equal(rows[0].metrics.call_coverage.value,null);
});

test('commercial evidence carries stage, currency and agreement version from the same population',()=>{
  const request={tenantId:'default_tenant',startDate:'2026-07-01',endDate:'2026-07-31',observationCutoff:cutoff,dateBasis:'capture_cohort' as const,grouping:'vendor' as const,currency:'ZAR',metrics:['collected_value'],filters:{}};
  const sql=compileEvidence(request,release,'collected_value','Vendor A').query;
  assert.match(sql,/stage,currency,agreement_version FROM f/);assert.match(sql,/commercial_stage,currency,agreement_version/);
});

test('new workspaces are routed, lazy loaded and use presentation-only table controls',()=>{
  const app=fs.readFileSync('src/App.tsx','utf8'),nav=fs.readFileSync('src/lib/navigation.ts','utf8'),vendor=fs.readFileSync('src/pages/VendorPerformance.tsx','utf8');
  for(const route of ['/vendors','/exceptions','/reconciliation']){assert.match(app,new RegExp(`path="${route}"`));assert.match(nav,new RegExp(`'${route}'`));}
  assert.match(app,/React\.lazy\(\(\) => import\('\.\/pages\/VendorPerformance'\)\)/);
  assert.match(vendor,/useDeferredValue/);assert.match(vendor,/Local controls — no new warehouse query/);assert.match(vendor,/Export \{matching\.length\} matching rows/);
});
