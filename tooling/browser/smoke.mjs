// Browser assertions against handwritten fixtures. This does not certify live warehouse accuracy.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/reporting-reference.json','utf8'));
const server=spawn(process.execPath,['dist/server/server.mjs'],{env:{...process.env,NODE_ENV:'production',PORT:'3187',IAP_AUDIENCE:'',CX_REPORTING_DATASET:''},stdio:'pipe'});
let browser;
const logs=[];server.stderr.on('data',d=>logs.push(d.toString()));
async function waitServer(){for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3187/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Server did not start: '+logs.join(''));}
const cutoff='2026-09-20T00:00:00.000Z';
let checks=0;
try{
  await waitServer();browser=await chromium.launch({headless:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});let noRelease=false,slow=false;
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()),payload=route.request().postDataJSON();
      let data={};
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Fixture tenant',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/reporting/catalogue')data={available:!noRelease,reason:noRelease?'No approved release has been published.':null,release:noRelease?null:{releaseId:'rfixture',cutoff,sourceBatchIds:['synthetic-batch'],sources:[],checks:[]}};
      else if(url.pathname==='/api/reporting/reports'){
        if(slow)await new Promise(r=>setTimeout(r,400));
        const req=payload.request,values=req.filters.source?.[0]==='Organic'?fixture.expected.organic:req.filters.vendor?.[0]==='Vendor A'?fixture.expected.vendorA:req.filters.vendor?.[0]==='Vendor B'?fixture.expected.vendorB:fixture.expected.all;
        data={executionId:'fixture-'+JSON.stringify(req.filters),token:'test-only-token',request:req,releaseId:'rfixture',modelVersion:'cx.facts.2.0.0',metricVersion:'cx.metrics.2.0.0',releaseCutoff:cutoff,sourceBatchIds:['synthetic-batch'],generatedAt:cutoff,validation:[],sources:[],groups:[],
          totals:req.metrics.map(id=>({metricId:id,group:null,value:values[id],numerator:values[id],denominator:id==='call_coverage'?'3':null,unit:id.endsWith('_value')?'currency':id.endsWith('_rate')||id==='call_coverage'?'percent':'records',calculationStatus:'CHECKED',completeness:'COMPLETE',reason:values[id]===null?'No eligible denominator':null}))};
      }else if(url.pathname==='/api/reporting/evidence')data={executionId:'fixture-{}',metricId:payload.metricId,rows:fixture.calls,rowCount:fixture.calls.length,truncated:false};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    await page.goto('http://127.0.0.1:3187/reports');await page.getByText('Available release: rfixture',{exact:true}).waitFor();
    await page.getByLabel('From (UTC)',{exact:true}).fill('2026-08-01');await page.getByLabel('Through (UTC)',{exact:true}).fill('2026-08-31');
    await page.getByRole('button',{name:'Create snapshot-bound report'}).click();
    const calls=page.getByTestId('metric-call_attempts').getByTestId('metric-value');await calls.waitFor();assert.equal(await calls.textContent(),'5');checks++;
    assert.equal(await page.getByTestId('metric-collected_value').getByTestId('metric-value').textContent(),'ZAR 0.29');checks++;
    await page.getByTestId('metric-call_attempts').getByRole('button',{name:'Inspect records'}).click();await page.getByText('5 records. Truncation: no. Preview shows up to 20 records.').waitFor();checks++;
    await page.getByLabel('Source',{exact:true}).fill('Organic');assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await page.getByTestId('metric-call_coverage').waitFor();assert.equal(await page.getByTestId('metric-call_coverage').getByTestId('metric-value').textContent(),'Unavailable');checks++;
    slow=true;await page.getByLabel('Source',{exact:true}).fill('');await page.getByLabel('Vendor',{exact:true}).fill('Vendor B');await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await page.getByLabel('Vendor',{exact:true}).fill('Vendor A');await page.waitForTimeout(500);assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    slow=false;await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await calls.waitFor();assert.equal(await calls.textContent(),'4');checks++;
    fs.mkdirSync('verification',{recursive:true});await page.screenshot({path:`verification/evidence-${viewport.width}.png`,fullPage:true});
    noRelease=true;await page.reload();await page.getByRole('heading',{name:'No approved release available'}).waitFor();assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    assert.deepEqual(errors,[]);checks++;await page.close();
  }
  fs.writeFileSync('verification/browser.json',JSON.stringify({checks,passed:checks,source:'synthetic API fixtures',liveWarehouseTested:false},null,2));console.log(`${checks} browser assertions passed on desktop and mobile using synthetic responses.`);
}finally{if(browser)await browser.close();server.kill('SIGTERM');}
