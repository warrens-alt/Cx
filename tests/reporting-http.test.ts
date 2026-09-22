import { ENGINE_HASH } from '../server/reporting/buildStamp';
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { once } from 'node:events';
import { createReportingRouter } from '../server/reporting/router';
import { FACTS, METRICS, METRIC_VERSION, MODEL_VERSION, type ReleaseManifest } from '../contracts/reporting';
import { REQUIRED_CHECKS } from '../server/reporting/release';
import { RequestError } from '../server/bigquery/filters';
const cutoff='2026-09-20T00:00:00.000Z';
const snapshot=(key:string)=>({table:`project.cx_reporting.rhttptest_${key}`,createdAt:cutoff,snapshotTime:cutoff});
const release:ReleaseManifest={releaseId:'rhttptest',tenantId:'default_tenant',metricVersion:METRIC_VERSION,modelVersion:MODEL_VERSION,engineHash:ENGINE_HASH,status:'PUBLISHED',builtAt:cutoff,cutoff,sourceBatchIds:['fixture'],
  snapshots:Object.fromEntries(FACTS.map(f=>[f,snapshot(f)])) as any,provenance:Object.fromEntries(['records','batches','contracts'].map(f=>[f,snapshot(f)])) as any,
  sources:FACTS.map(f=>({fact:f,status:'COMPLETE',contractVersion:'fixture',completeThrough:cutoff,earliestAvailable:'2026-01-01T00:00:00Z',owner:'test',approvalReference:'synthetic'})),
  checks:REQUIRED_CHECKS.map(id=>({id,status:'PASS',observed:'0',expected:'0',jobId:'synthetic'})),approvedBy:'fixture',approvalReference:'test-only'};
test('HTTP report scope, replay, permission recheck and precision',async()=>{
  process.env.CX_REPORT_SIGNING_KEY='test-only-signing-key-at-least-thirty-two-bytes';
  let queries=0;
  const repo:any={configured:true,release:async()=>release,assertSnapshots:async()=>{},query:async()=>{queries++;return {rows:[{metric_id:'fetched_leads',group_key:null,is_total:true,value:'9007199254740993',numerator:'9007199254740993',denominator:null}],jobId:'test'};}};
  const app=express();app.use(express.json());
  // Test-only principal injection is confined to this test process; production has no bypass.
  app.use((req,res,next)=>{res.locals.principal={subject:req.get('x-test-user')||'test',email:'test@example.com',role:'viewer',tenants:req.get('x-test-deny')?[]:['default_tenant']};next();});
  app.use('/api/reporting',createReportingRouter(repo));app.use((e:any,_q:any,r:any,_n:any)=>r.status(e instanceof RequestError?e.status:500).json({success:false,error:e.message}));
  const server=app.listen(0,'127.0.0.1');await once(server,'listening');const port=(server.address()as any).port;
  const post=(path:string,body:unknown,headers={})=>fetch(`http://127.0.0.1:${port}/api/reporting/${path}`,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  const request={tenantId:'default_tenant',startDate:'2026-08-01',endDate:'2026-08-31',observationCutoff:cutoff,dateBasis:'capture_cohort',grouping:'none',currency:'ZAR',metrics:['fetched_leads'],filters:{}};
  try{
    const exceptions=await fetch(`http://127.0.0.1:${port}/api/reporting/exceptions?tenantId=default_tenant`);assert.equal(exceptions.status,200);const exceptionData=(await exceptions.json()).data;assert.equal(exceptionData.rules.find((rule:any)=>rule.id==='identifier_mismatch').count,'0');assert.equal(exceptionData.rules.find((rule:any)=>rule.id==='delivered_not_dialled_sla').count,null);
    const response=await post('reports',{request});assert.equal(response.status,200);const first=(await response.json()).data;assert.equal(first.totals[0].value,'9007199254740993');assert.equal(first.metricDefinitions[0].label,'Fetched Leads');assert.equal(first.metricDefinitions[0].numeratorLabel,'Distinct Lead Submissions');assert.equal(first.metricDefinitions[0].id,'fetched_leads');
    const replay=await post('replay',{token:first.token});assert.equal(replay.status,200);const again=(await replay.json()).data;assert.equal(first.executionId,again.executionId);assert.deepEqual(first.totals,again.totals);
    assert.equal((await post('replay',{token:first.token},{'x-test-deny':'true'})).status,403);
    assert.equal((await post('replay',{token:first.token},{'x-test-user':'different'})).status,403);
    assert.equal((await post('reports',{request:{...request,metrics:['SUM(secret)']}})).status,400);
    assert.equal((await post('reports',{request:{...request,tenantId:'other'}})).status,403);
    assert.equal(queries,2);
  }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));delete process.env.CX_REPORT_SIGNING_KEY;}
});
