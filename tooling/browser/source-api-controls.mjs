// Synthetic API rendering tests; warehouse SQL executes only in the explicit sources:check deployment command.
import assert from 'node:assert/strict';
import fs from 'node:fs';
const sources=[['leads','Lead Ledger','clustered_lead_ledger'],['calls','Dialler Records','lead_ledger_all_vicidial_insights'],['timeToDial','Time-to-Dial Source','lead_ledger_all_vicidial_insights_time_to_dial'],['activations','BLC Activation Source','tbl_blc_activations'],['marketing','Platform Media Insights','lead_ledger_platform_insights']].map(([role,label,table])=>({role,label,table:`project.lead_ledger.${table}`,api:`/api/analytics/source-metrics/${role}`,status:'SCHEMA_PRESENT',rowCount:'9007199254740993',legacyConsumers:[role==='marketing'?'acquisition':'overview']}));
const metrics=[{id:'source_rows',label:'Media Source Rows',value:'2',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'impressions',label:'Reported Impressions',value:'12000',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'clicks',label:'Reported Clicks',value:'240',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'platform_leads',label:'Platform Lead Actions',value:'16',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'}];
export async function verifySourceApis(browser,base){let checks=0;
  for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});const errors=[];let missing=false;page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{const url=new URL(route.request().url());let data={},status=200;
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Synthetic source tenant',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/analytics/source-coverage')data={inventoryComplete:true,sources,unmappedTables:[{table:'project.lead_ledger.unmapped_fixture',reason:'Mapping is not approved.'}],metricLineage:{versioned:[{metricId:'fetched_leads',label:'Fetched Leads',requiredFacts:['leads'],api:'/api/reporting/reports'}]}};
      else if(url.pathname.includes('/source-metrics/')){
        const role=url.pathname.split('/').at(-1);data={role,table:sources.find(s=>s.role===role).table,scope:{clientId:'default_tenant',startDate:url.searchParams.get('startDate'),endDate:url.searchParams.get('endDate')},dateBasis:role==='timeToDial'?'Expected first-dial date (not an observed call date)':'Source record date',metrics:[{id:'source_rows',label:'Selected Source Rows',value:'9007199254740993',status:'MEASURED',validRows:'9007199254740993',missingRows:'0',invalidRows:'0'}],queryJobId:'synthetic-source-job',warning:'Not independently reconciled'};
      }else if(url.pathname==='/api/analytics/acquisition'){
        if(missing){status=422;data={};}else data={metrics,groups:[{group:'Synthetic Channel',metrics}],scope:{startDate:'2026-08-01',endDate:'2026-08-31'},dateBasis:'Media reporting date',table:sources[4].table,queryJobId:'synthetic-media-job',financialReason:'Budget is not verified spend. No cost or profit is inferred.',validationStatus:'NOT_INDEPENDENTLY_RECONCILED',warning:'Platform actions are not ledger leads.'};
      }
      await route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{success:true,data}:{success:false,error:'Source access is unavailable; no figures were substituted.'})});
    });
    try{
      await page.goto(base+'/data-coverage');const table=page.getByRole('table',{name:'Source table coverage'});await table.waitFor();
      assert.equal(await table.locator('tbody tr').count(),5);checks++;
      assert.equal(await page.getByText('project.lead_ledger.unmapped_fixture',{exact:true}).count(),1);checks++;
      assert.equal(await table.getByText('9,007,199,254,740,993',{exact:true}).count(),5);checks++;
      for(const role of['leads','timeToDial','marketing']){
        await page.getByLabel('Source to inspect').selectOption(role);await page.getByRole('button',{name:'Check source metrics',exact:true}).click();
        const rows=page.getByRole('table',{name:'Populated source metrics'});await rows.waitFor();assert.equal(await rows.getByRole('cell',{name:'9,007,199,254,740,993',exact:true}).count(),1);checks++;
      }
      await page.screenshot({path:`verification/source-coverage-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      await page.goto(base+'/acquisition');await page.getByRole('table',{name:'Media channel performance'}).waitFor();
      assert.equal(await page.getByText('12,000',{exact:true}).count(),3);checks++;
      assert.equal(await page.getByRole('heading',{name:'Spend-based metrics unavailable',exact:true}).count(),1);checks++;
      await page.screenshot({path:`verification/media-api-${viewport.width}.png`,fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      missing=true;await page.reload();await page.getByRole('alert').getByText('Source access is unavailable; no figures were substituted.',{exact:false}).waitFor();
      assert.equal(await page.getByRole('table',{name:'Media channel performance'}).count(),0);checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(e){await page.screenshot({path:`verification/source-api-failure-${viewport.width}.png`,fullPage:true});fs.writeFileSync(`verification/source-api-failure-${viewport.width}.json`,JSON.stringify({error:String(e),stack:e.stack,body:await page.locator('body').innerText()},null,2));throw e;}finally{await page.close();}
  }return checks;
}
