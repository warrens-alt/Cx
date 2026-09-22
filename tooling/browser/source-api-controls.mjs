// Synthetic API rendering tests; warehouse SQL executes only in the explicit sources:check deployment command.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const sources=[['leads','Lead Ledger','clustered_lead_ledger'],['calls','Dialler Records','lead_ledger_all_vicidial_insights'],['timeToDial','Time-to-Dial Source','lead_ledger_all_vicidial_insights_time_to_dial'],['activations','BLC Activation Source','tbl_blc_activations'],['marketing','Platform Media Insights','lead_ledger_platform_insights']].map(([role,label,table])=>({role,label,table:`project.lead_ledger.${table}`,api:`/api/analytics/source-metrics/${role}`,status:'SCHEMA_PRESENT',rowCount:'9007199254740993',legacyConsumers:[role==='marketing'?'acquisition':'overview']}));
const metrics=[{id:'source_rows',label:'Media Source Rows',value:'2',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'impressions',label:'Reported Impressions',value:'12000',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'clicks',label:'Reported Clicks',value:'240',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'},
  {id:'platform_leads',label:'Platform Lead Actions',value:'16',status:'MEASURED',validRows:'2',missingRows:'0',invalidRows:'0'}];
export async function verifySourceApis(browser,base,output='verification'){let checks=0;fs.mkdirSync(output,{recursive:true});
  for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});const errors=[];let missing=false,sourceFailure=null;page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{const url=new URL(route.request().url());let data={},status=200;
      if(url.pathname==='/api/analytics/clients')data=[{id:'default_tenant',name:'Synthetic source tenant',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/analytics/source-coverage')data={inventoryComplete:true,sources,unmappedTables:[{table:'project.lead_ledger.unmapped_fixture',reason:'Mapping is not approved.'}],metricLineage:{versioned:[{metricId:'fetched_leads',label:'Fetched Leads',requiredFacts:['leads'],api:'/api/reporting/reports'}]}};
      else if(url.pathname.includes('/source-metrics/')){
        if(sourceFailure==='html')return route.fulfill({status:200,contentType:'text/html',body:'<html>Private upstream gateway body</html>'});
        if(sourceFailure==='unauthenticated')return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false,error:'Synthetic source session expired.',requestId:'source-session-123'})});
        const role=url.pathname.split('/').at(-1);data={role,table:sources.find(s=>s.role===role).table,scope:{clientId:'default_tenant',startDate:url.searchParams.get('startDate'),endDate:url.searchParams.get('endDate')},dateBasis:role==='timeToDial'?'Expected first-dial date (not an observed call date)':'Source record date',metrics:[{id:'source_rows',label:'Selected Source Rows',value:'9007199254740993',status:'MEASURED',validRows:'9007199254740993',missingRows:'0',invalidRows:'0'}],queryJobId:'synthetic-source-job',warning:'Not independently reconciled'};
        if(sourceFailure==='scope')data.scope.clientId='another-workspace';
        if(sourceFailure==='precision')data.metrics[0].value=9007199254740992;
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
      await page.screenshot({path:path.join(output,`source-coverage-${viewport.width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      for(const [failure,message]of[['html',/HTML instead of JSON/],['scope',/do not match the selected workspace/],['precision',/malformed or imprecise values/]]){
        sourceFailure=failure;await page.getByRole('button',{name:'Check source metrics',exact:true}).click();
        await page.getByRole('alert').filter({hasText:message}).waitFor();checks++;
        assert.equal(await page.getByRole('table',{name:'Populated source metrics'}).count(),0);checks++;
        assert.equal(await page.getByText(/Private upstream gateway body|Data request failed \(200\)/).count(),0);checks++;
      }
      await page.screenshot({path:path.join(output,`source-contract-error-${viewport.width}.png`),fullPage:false});
      sourceFailure=null;await page.getByRole('button',{name:'Check source metrics',exact:true}).click();
      await page.getByRole('table',{name:'Populated source metrics'}).waitFor();checks++;
      sourceFailure='unauthenticated';await page.getByRole('button',{name:'Check source metrics',exact:true}).click();
      await page.getByRole('heading',{name:'Workspace access is unavailable',exact:true}).waitFor();checks++;
      assert.equal(await page.getByRole('table',{name:'Populated source metrics'}).count(),0);checks++;
      assert.equal(await page.getByRole('table',{name:'Source table coverage'}).count(),0);checks++;
      sourceFailure=null;await page.getByRole('button',{name:'Retry workspace access',exact:true}).click();
      await page.getByRole('table',{name:'Source table coverage'}).waitFor();checks++;
      await page.goto(base+'/acquisition');await page.getByRole('table',{name:'Media channel performance'}).waitFor();
      assert.equal(await page.getByText('12,000',{exact:true}).count(),3);checks++;
      assert.equal(await page.getByRole('heading',{name:'Spend-based metrics unavailable',exact:true}).count(),1);checks++;
      await page.screenshot({path:path.join(output,`media-api-${viewport.width}.png`),fullPage:true});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks++;
      missing=true;await page.reload();await page.getByRole('alert').getByText('Source access is unavailable; no figures were substituted.',{exact:false}).waitFor();
      assert.equal(await page.getByRole('table',{name:'Media channel performance'}).count(),0);checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(e){await page.screenshot({path:path.join(output,`source-api-failure-${viewport.width}.png`),fullPage:true});fs.writeFileSync(path.join(output,`source-api-failure-${viewport.width}.json`),JSON.stringify({error:String(e),stack:e.stack,body:await page.locator('body').innerText()},null,2));throw e;}finally{await page.close();}
  }return checks+await verifyConnectionHealth(browser,base,output);
}

/** Read-only browser fixtures: all API calls are intercepted; no Google Cloud access. */
export async function verifyConnectionHealth(browser,base,output='verification'){
  fs.mkdirSync(output,{recursive:true});let checks=0;
  for(const viewport of[{width:1440,height:1000},{width:390,height:844}]){
    const page=await browser.newPage({viewport});const errors=[];let mode='scalar';
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/**',async route=>{
      const url=new URL(route.request().url());let data={};
      if(url.pathname==='/api/analytics/clients')data=[{id:'health-fixture',name:'Synthetic health workspace',currency:'ZAR',timezone:'UTC',capabilities:{}}];
      else if(url.pathname==='/api/analytics/health'){
        assert.equal(url.searchParams.get('clientId'),'health-fixture');checks++;
        if(mode==='html')return route.fulfill({status:200,contentType:'text/html',body:'<html>Private health gateway body</html>'});
        if(mode==='unauthenticated')return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({success:false,error:'Synthetic health session expired.',requestId:'health-session-123'})});
        data={status:mode==='malformed'?'unexpected':'Connected',latestData:mode==='wrapper'?{value:'2026-08-25T13:45:00.000Z'}:mode==='invalidDate'?'not-a-date':mode==='missing'?null:'2026-08-25T13:45:00.000Z'};
      }
      await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
    });
    try{
      await page.goto(base+'/admin');
      await page.getByRole('heading',{name:'Configuration',exact:true}).waitFor();checks++;
      assert.equal(new URL(page.url()).pathname,'/admin');checks++;
      assert.ok(await page.title());checks++;
      for(const timestampMode of['scalar','wrapper']){
        mode=timestampMode;await page.reload();
        await page.getByText('Connection check succeeded: Synthetic health workspace',{exact:true}).waitFor();checks++;
        const expected=await page.evaluate(()=>new Date('2026-08-25T13:45:00.000Z').toLocaleString(undefined,{timeZone:'UTC'}));
        assert.equal(await page.getByText(expected,{exact:true}).count(),1);checks++;
        assert.equal(await page.getByText('UTC · Freshness not independently verified',{exact:true}).count(),1);checks++;
        assert.equal(await page.getByText('Server-managed Google credentials',{exact:true}).count(),1);checks++;
      }
      await page.screenshot({path:path.join(output,`connection-health-${viewport.width}.png`),fullPage:false});
      mode='missing';await page.reload();await page.getByText('No valid timestamp reported',{exact:true}).waitFor();checks++;
      for(const[failure,message]of[['malformed',/invalid health result/],['invalidDate',/invalid source timestamp/],['html',/HTML instead of JSON/]]){
        mode=failure;await page.reload();await page.getByRole('alert').filter({hasText:message}).waitFor();checks++;
        assert.equal(await page.getByText('Connection check succeeded: Synthetic health workspace',{exact:true}).count(),0);checks++;
        assert.equal(await page.getByText(/Private health gateway body|Data request failed \(200\)|Invalid Date/).count(),0);checks++;
      }
      await page.screenshot({path:path.join(output,`connection-health-error-${viewport.width}.png`),fullPage:false});
      mode='scalar';await page.getByRole('button',{name:'Retry connection check',exact:true}).click();
      await page.getByText('Connection check succeeded: Synthetic health workspace',{exact:true}).waitFor();checks++;
      mode='unauthenticated';await page.reload();await page.getByRole('heading',{name:'Workspace access is unavailable',exact:true}).waitFor();checks++;
      assert.equal(await page.getByText('Connection check succeeded: Synthetic health workspace',{exact:true}).count(),0);checks++;
      await page.getByText(/Synthetic health session expired.*health-session-123/).waitFor();checks++;
      mode='scalar';await page.getByRole('button',{name:'Retry workspace access',exact:true}).click();
      await page.getByText('Connection check succeeded: Synthetic health workspace',{exact:true}).waitFor();checks++;
      assert.equal(await page.locator('vite-error-overlay').count(),0);checks++;
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);checks++;
      assert.deepEqual(errors,[]);checks++;
    }catch(e){await page.screenshot({path:path.join(output,`connection-health-failure-${viewport.width}.png`),fullPage:true});fs.writeFileSync(path.join(output,`connection-health-failure-${viewport.width}.json`),JSON.stringify({error:String(e),stack:e.stack,body:await page.locator('body').innerText()},null,2));throw e;}finally{await page.close();}
  }
  return checks;
}
