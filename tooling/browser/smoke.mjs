import { verifyExploreWorkspace } from './explore-controls.mjs';
import { verifyVettingControls } from './vetting-controls.mjs';
import { verifyVisualControls } from './visual-controls.mjs';
import { verifySourceApis } from './source-api-controls.mjs';
// Browser assertions against handwritten fixtures. This does not certify live warehouse accuracy.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { verifyRestoredFilters } from './filter-controls.mjs';
import { verifyFrontendOptimisations } from './optimisation-controls.mjs';
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/reporting-reference.json','utf8'));
const server=spawn(process.execPath,['dist/server/server.mjs'],{env:{...process.env,NODE_ENV:'production',PORT:'3187',IAP_AUDIENCE:'',CX_REPORTING_DATASET:''},stdio:'pipe'});
let browser, activePage;
const logs=[];server.stderr.on('data',d=>logs.push(d.toString()));
async function waitServer(){for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3187/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Server did not start: '+logs.join(''));}
const cutoff='2026-09-20T00:00:00.000Z';
let checks=0;
try{
  await waitServer();fs.mkdirSync('verification',{recursive:true});browser=await chromium.launch({headless:true});
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});activePage=page;let noRelease=false,slow=false;const requestCounts={};
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url()),payload=route.request().postDataJSON();requestCounts[url.pathname]=(requestCounts[url.pathname]||0)+1;
      let data={};
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Fixture tenant',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/reporting/catalogue')data={available:!noRelease,reason:noRelease?'No approved release has been published.':null,release:noRelease?null:{releaseId:'rfixture',cutoff,sourceBatchIds:['synthetic-batch'],sources:[],checks:[]}};
      else if(url.pathname==='/api/analytics/calls')data={calledLeads:8,totalCalls:12,avgCalls:1.5,oneCallLeads:4,oneCallRate:50,repeatCallLeads:4,repeatCallRate:50,totalDurationHours:1.25,
        chart:[{bucket:'1 Call',current:4,rpc:50,sale:25,activation:25,revPerLead:25,totalRevenue:100}],
        hourly:[{label:'09:00',volume:8,rpcRate:50,saleRate:25,revenue:100}],dayOfWeek:[{day:'Monday',volume:8,rpcRate:50,saleRate:25,revenue:100}],
        vendors:[{vendor:'Synthetic Vendor',totalLeads:8,calledLeads:10,avgCallsPerLead:1.2,oneCallRate:50,rpcRate:50,saleRate:20,revPerLead:10}],
        dispositions:[{disposition:'Synthetic Sale',volume:2,share:100,rpcRate:100,saleRate:100,revenue:100}]};
      else if(url.pathname==='/api/analytics/speed-to-lead')data={metrics:[{id:'capture_to_delivery',name:'Capture to Delivery',avg:'8m'},{id:'delivery_to_first_dial',name:'Delivery to First Call',avg:'20m'}],
        buckets:['< 5m','5-15m','15-60m','> 1h'].map((bucket,i)=>({bucket,leads:4+i,rpcCount:2,rpc:50,saleCount:1,sale:25,billableCount:1,billableRate:100,actCount:1,activation:100,revenue:100,revPerLead:25}))};
      else if(url.pathname==='/api/analytics/explore')data=[{dim1:'Synthetic Source',value:12.5,sampleSize:8,fullFunnel:{}}];
      else if(url.pathname==='/api/reporting/reports'){
        if(slow)await new Promise(r=>setTimeout(r,400));
        const req=payload.request,values=req.filters.source?.[0]==='Organic'?fixture.expected.organic:req.filters.vendor?.[0]==='Vendor A'?fixture.expected.vendorA:req.filters.vendor?.[0]==='Vendor B'?fixture.expected.vendorB:fixture.expected.all;
        data={executionId:'fixture-'+JSON.stringify(req.filters),token:'test-only-token',request:req,releaseId:'rfixture',modelVersion:'cx.facts.2.0.0',metricVersion:'cx.metrics.2.0.1',releaseCutoff:cutoff,sourceBatchIds:['synthetic-batch'],generatedAt:cutoff,validation:[],sources:[],groups:[],
          totals:req.metrics.map(id=>({metricId:id,group:null,value:values[id],numerator:id==='call_coverage'?values.called_episodes:id==='sale_activation_rate'?(values.sale_activation_rate===null?'0':String(Number(values.sale_events)*Number(values.sale_activation_rate)/100)):values[id],denominator:id==='call_coverage'?values.delivered_episodes:id==='sale_activation_rate'?values.sale_events:null,unit:id.endsWith('_value')?'currency':id.endsWith('_rate')||id==='call_coverage'?'percent':'records',calculationStatus:'CHECKED',completeness:'COMPLETE',reason:values[id]===null?'No eligible denominator':null}))};
      }else if(url.pathname==='/api/reporting/evidence')data={executionId:'fixture-{}',metricId:payload.metricId,rows:fixture.calls,rowCount:fixture.calls.length,truncated:false};
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    await page.goto('http://127.0.0.1:3187/reports');await page.getByText('Available release: rfixture',{exact:true}).waitFor();
    await page.screenshot({path:`verification/frontend-scope-${viewport.width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No document-level horizontal overflow');checks++;
    assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
    await page.getByRole('button',{name:'Search pages',exact:true}).click();
    const searchDialog=page.getByRole('dialog',{name:'Quick navigation',exact:true});await searchDialog.waitFor();
    await page.getByRole('combobox',{name:'Search pages and navigation'}).fill('zzzz-no-page');
    await page.getByText('No pages match “zzzz-no-page”. Try “calls”, “sources” or “evidence”.',{exact:true}).waitFor();checks++;
    await page.keyboard.press('Escape');await searchDialog.waitFor({state:'hidden'});
    assert.equal(await page.getByRole('button',{name:'Search pages',exact:true}).evaluate(el=>el===document.activeElement),true);checks++;
    if(viewport.width<1024){
      await page.getByRole('button',{name:'Open navigation',exact:true}).click();const navigation=page.getByRole('dialog',{name:'Navigation',exact:true});await navigation.waitFor();
      for(let n=0;n<35;n++)await page.keyboard.press('Tab');
      assert.ok(await navigation.evaluate(el=>el.contains(document.activeElement)),'Tab stays within navigation');checks++;
      await page.screenshot({path:`verification/frontend-navigation-${viewport.width}.png`,fullPage:true});
      await page.keyboard.press('Escape');await navigation.waitFor({state:'hidden'});checks++;
    }else{
      await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();assert.equal(await page.getByRole('navigation',{name:'Main navigation'}).count(),0);checks++;
      await page.getByRole('button',{name:'Expand navigation',exact:true}).click();await page.getByRole('navigation',{name:'Main navigation'}).waitFor();checks++;
    }

    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Evidence Reports');checks++;
    assert.equal(await page.title(),'ConversionX | Lead & Revenue Analytics');checks++;
    await page.getByLabel('From (UTC)',{exact:true}).fill('2026-08-01');await page.getByLabel('Through (UTC)',{exact:true}).fill('2026-08-31');
    await page.getByRole('button',{name:'Create snapshot-bound report'}).click();
    assert.equal(await page.getByLabel('Call Attempts',{exact:true}).count(),1);checks++;
    fs.mkdirSync('verification',{recursive:true});
    const calls=page.getByTestId('metric-call_attempts').getByTestId('metric-value');await calls.waitFor();assert.equal(await calls.textContent(),'5');checks++;
    assert.equal(await page.getByTestId('metric-call_attempts').getByRole('heading').textContent(),'Call Attempts');checks++;
    await page.getByTestId('metric-call_coverage').getByText('Delivered Episodes with a Subsequent Call: 3 / Successful Delivery Episodes: 3',{exact:true}).waitFor();checks++;

    assert.equal(await page.getByTestId('metric-collected_value').getByRole('heading').textContent(),'Collected Amount');checks++;
    await page.getByTestId('metric-call_attempts').scrollIntoViewIfNeeded();
    await page.screenshot({path:`verification/frontend-results-${viewport.width}.png`,fullPage:true});
    await page.getByTestId('metric-call_coverage').getByRole('button',{name:'Definition',exact:true}).click();
    await page.getByLabel('Metric definition').getByText('Delivered Episodes with a Subsequent Call / Successful Delivery Episodes × 100',{exact:false}).waitFor();checks++;
    assert.equal(await page.getByTestId('metric-collected_value').getByTestId('metric-value').textContent(),'ZAR 0.29');checks++;
    await page.getByTestId('metric-call_attempts').getByRole('button',{name:'Inspect records'}).click();await page.getByText('5 records. Truncation: no. Preview shows up to 20 records.').waitFor();checks++;
    assert.equal(await page.getByRole('heading',{name:'Evidence: Call Attempts',exact:true}).count(),1);checks++;
    await page.getByLabel('Source',{exact:true}).fill('Organic');assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await page.getByTestId('metric-call_coverage').waitFor();assert.equal(await page.getByTestId('metric-call_coverage').getByTestId('metric-value').textContent(),'Unavailable');checks++;
    slow=true;await page.getByLabel('Source',{exact:true}).fill('');await page.getByLabel('Vendor',{exact:true}).fill('Vendor B');await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await page.getByLabel('Vendor',{exact:true}).fill('Vendor A');await page.waitForTimeout(500);assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    slow=false;await page.getByRole('button',{name:'Create snapshot-bound report'}).click();await calls.waitFor();assert.equal(await calls.textContent(),'4');checks++;
    fs.mkdirSync('verification',{recursive:true});await page.screenshot({path:`verification/evidence-${viewport.width}.png`,fullPage:true});
    noRelease=true;await page.reload();await page.getByRole('heading',{name:'No approved release available'}).waitFor();assert.equal(await page.locator('[aria-label="Report results"]').count(),0);checks++;
    await page.goto('http://127.0.0.1:3187/explore');await page.getByLabel('Measure',{exact:true}).selectOption('sale_rate');
    await page.getByLabel('Visualisation',{exact:true}).selectOption('table');await page.getByRole('cell',{name:'12.5%',exact:true}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Data Explorer');checks++;
    assert.equal(await page.getByText('Not additive',{exact:true}).count(),1);checks++;
    const explorerTable=page.getByRole('table',{name:'Explorer results',exact:true});
    const metricHeader=explorerTable.getByRole('columnheader',{name:'Sales / Dialled Leads (%)',exact:true});
    await metricHeader.waitFor();assert.equal((await metricHeader.textContent()).trim(),'Sales / Dialled Leads (%)');checks++;
    assert.equal(await page.getByText('1,250%',{exact:true}).count(),0);checks++;
    await page.screenshot({path:`verification/naming-explorer-${viewport.width}.png`,fullPage:true});
    await page.goto('http://127.0.0.1:3187/call-performance?startDate=2026-08-01&endDate=2026-08-31');
    await page.getByRole('button',{name:'Report filters',exact:true}).click();
    const filterPanel=page.getByRole('region',{name:'Legacy report filters'});await filterPanel.waitFor();
    checks+=await verifyRestoredFilters(page,viewport);
    const requestsBefore=requestCounts['/api/analytics/calls']||0;
    await page.getByRole('button',{name:'Reload results',exact:true}).click();
    await page.waitForTimeout(250);
    assert.ok(requestCounts['/api/analytics/calls']>requestsBefore,'Reload refetches the active report');checks++;
    await page.getByRole('button',{name:'Report filters',exact:true}).click();await filterPanel.waitFor({state:'hidden'});checks++;
    await page.getByText('Capture dates: 2026-08-01 to 2026-08-31 · 0 filters',{exact:true}).waitFor();checks++;

    await page.getByRole('heading',{name:/^One-Call Lead Share$/i}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Call Performance');checks++;
    assert.equal(await page.getByText('One-Call Resolution',{exact:true}).count(),0);checks++;
    await page.getByRole('heading',{name:/^One-Call Lead Share$/i}).scrollIntoViewIfNeeded();
    await page.screenshot({path:`verification/frontend-calls-${viewport.width}.png`,fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
    assert.equal(await page.getByRole('button',{name:'Call-Attempt Bands',exact:true}).getAttribute('aria-pressed'),'true');checks++;
    if(viewport.width>=1024){
      await page.getByRole('button',{name:'Expand chart: Recorded Outcomes by Call-Attempt Band',exact:true}).click();
      await page.waitForFunction(()=>Boolean(document.fullscreenElement));checks++;
      await page.getByRole('button',{name:'Exit full screen: Recorded Outcomes by Call-Attempt Band',exact:true}).click();
      await page.waitForFunction(()=>document.fullscreenElement===null);checks++;
    }
    await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();
    await page.getByRole('columnheader',{name:/^First-Dial Weekday$/i}).waitFor();checks++;
    await page.getByRole('button',{name:'Vendor & Disposition Records',exact:true}).click();
    await page.getByRole('columnheader',{name:/^Dialled Transaction Rows$/i}).waitFor();checks++;
    await page.getByLabel('Find Vendor',{exact:true}).fill('Synthetic Vendor');
    assert.equal(await page.getByRole('cell',{name:'Synthetic Vendor',exact:true}).count(),1);checks++;
    await page.screenshot({path:`verification/naming-calls-${viewport.width}.png`,fullPage:true});
    await page.goto('http://127.0.0.1:3187/speed-to-lead');
    await page.getByRole('heading',{name:/^Capture-to-Delivery Mean$/i}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Delivery & First-Dial Timing');checks++;
    await page.getByRole('columnheader',{name:/^Transaction Rows$/i}).waitFor();checks++;
    await page.getByRole('rowheader',{name:/^0–5 Whole Minutes$/i}).waitFor();checks++;
    assert.equal(await page.getByText('1,250%',{exact:true}).count(),0);checks++;
    await page.screenshot({path:`verification/naming-timing-${viewport.width}.png`,fullPage:true});
    await page.getByRole('button',{name:'Use compact table spacing',exact:true}).click();
    assert.equal(await page.locator('.cx-app').getAttribute('data-density'),'compact');checks++;
    await page.reload();await page.getByRole('heading',{name:/^Capture-to-Delivery Mean$/i}).waitFor();
    assert.equal(await page.locator('.cx-app').getAttribute('data-density'),'compact');checks++;
    await page.getByRole('button',{name:'Use comfortable table spacing',exact:true}).click();
    await page.getByRole('button',{name:'Search pages',exact:true}).click();await page.getByRole('combobox',{name:'Search pages and navigation'}).fill('evidence');
    await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Evidence Reports',exact:true}).waitFor();checks++;
    await page.goto('http://127.0.0.1:3187/page-that-does-not-exist');await page.getByRole('heading',{name:'Page not found',exact:true}).waitFor();checks++;
    await page.getByRole('link',{name:'Open Evidence Reports',exact:true}).click();await page.getByRole('heading',{name:'Evidence Reports',exact:true}).waitFor();checks++;
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.ok(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches));checks++;
    assert.deepEqual(errors,[]);checks++;await page.close();
  }
  {
    const page=await browser.newPage({viewport:{width:1280,height:800}});activePage=page;const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/api/**',route=>route.fulfill({status:401,headers:{'x-request-id':'00000000-0000-4000-8000-000000000001'},contentType:'application/json',body:JSON.stringify({success:false,error:'Sign in through the configured identity gateway'})}));
    await page.goto('http://127.0.0.1:3187/reports');
    await page.getByRole('heading',{name:'Workspace access is unavailable',exact:true}).waitFor();checks++;
    await page.getByText('No fallback tenant or substitute analytical data is being displayed.',{exact:true}).waitFor();checks++;
    assert.equal(await page.getByText('Primary Tenant',{exact:true}).count(),0);checks++;
    assert.ok((await page.getByRole('alert').first().textContent()).includes('00000000-0000-4000-8000-000000000001'));checks++;
    assert.deepEqual(errors,[]);checks++;
    await page.screenshot({path:'verification/authentication-unavailable-1280.png',fullPage:true});await page.close();
  }
  checks += await verifyFrontendOptimisations(browser, 'http://127.0.0.1:3187');
  checks += await verifySourceApis(browser, 'http://127.0.0.1:3187');
  checks += await verifyVisualControls(browser, 'http://127.0.0.1:3187');
  checks += await verifyVettingControls(browser, 'http://127.0.0.1:3187');
  checks += await verifyExploreWorkspace(browser, 'http://127.0.0.1:3187');
  fs.writeFileSync('verification/browser.json',JSON.stringify({checks,passed:checks,source:'synthetic API fixtures',liveWarehouseTested:false},null,2));console.log(`${checks} browser assertions passed on desktop and mobile using synthetic responses.`);
}catch(error){if(activePage&&!activePage.isClosed()){fs.mkdirSync('verification',{recursive:true});await activePage.screenshot({path:'verification/browser-failure.png',fullPage:true});fs.writeFileSync('verification/browser-failure.html',await activePage.content());fs.writeFileSync('verification/browser-failure.json',JSON.stringify({url:activePage.url(),checks,message:String(error),stack:error.stack,headers:await activePage.locator('thead th').allTextContents(),accessibility:await activePage.locator('body').ariaSnapshot()},null,2));}throw error;}finally{if(browser)await browser.close();server.kill('SIGTERM');}
