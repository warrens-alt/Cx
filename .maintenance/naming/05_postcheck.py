from pathlib import Path
import json
R = Path.cwd()
# Fixed English decimal-dot rendering, matching the existing exact-number contract.
for name in ['contracts/legacyMetrics.ts', 'src/pages/CallPerformance.tsx', 'src/pages/SpeedToLead.tsx']:
    p = R/name
    p.write_text(p.read_text().replace("'en-ZA'", "'en-GB'"))
p=R/'tooling/browser/smoke.mjs'
s=p.read_text()
needle="      else if(url.pathname==='/api/analytics/explore')"
insert="""      else if(url.pathname==='/api/analytics/calls')data={calledLeads:8,totalCalls:12,avgCalls:1.5,oneCallLeads:4,oneCallRate:50,repeatCallLeads:4,repeatCallRate:50,totalDurationHours:1.25,
        chart:[{bucket:'1 Call',current:4,rpc:50,sale:25,activation:25,revPerLead:25,totalRevenue:100}],
        hourly:[{label:'09:00',volume:8,rpcRate:50,saleRate:25,revenue:100}],dayOfWeek:[{day:'Monday',volume:8,rpcRate:50,saleRate:25,revenue:100}],
        vendors:[{vendor:'Synthetic Vendor',totalLeads:8,calledLeads:10,avgCallsPerLead:1.2,oneCallRate:50,rpcRate:50,saleRate:20,revPerLead:10}],
        dispositions:[{disposition:'Synthetic Sale',volume:2,share:100,rpcRate:100,saleRate:100,revenue:100}]};
      else if(url.pathname==='/api/analytics/speed-to-lead')data={metrics:[{id:'capture_to_delivery',name:'Capture to Delivery',avg:'8m'},{id:'delivery_to_first_dial',name:'Delivery to First Call',avg:'20m'}],
        buckets:['< 5m','5-15m','15-60m','> 1h'].map((bucket,i)=>({bucket,leads:4+i,rpcCount:2,rpc:50,saleCount:1,sale:25,billableCount:1,billableRate:100,actCount:1,activation:100,revenue:100,revPerLead:25}))};
"""
assert needle in s
s=s.replace(needle,insert+needle,1)
needle="    assert.deepEqual(errors,[]);checks++;await page.close();"
insert="""    await page.goto('http://127.0.0.1:3187/call-performance');
    await page.getByRole('heading',{name:'One-Call Lead Share',exact:true}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Call Performance');checks++;
    assert.equal(await page.getByText('One-Call Resolution',{exact:true}).count(),0);checks++;
    await page.getByRole('button',{name:'First-Dial Timing',exact:true}).click();
    await page.getByRole('columnheader',{name:'First-Dial Weekday',exact:true}).waitFor();checks++;
    await page.getByRole('button',{name:'Vendor & Disposition Records',exact:true}).click();
    await page.getByRole('columnheader',{name:'Dialled Transaction Rows',exact:true}).waitFor();checks++;
    await page.getByLabel('Find Vendor',{exact:true}).fill('Synthetic Vendor');
    assert.equal(await page.getByRole('cell',{name:'Synthetic Vendor',exact:true}).count(),1);checks++;
    await page.screenshot({path:`verification/naming-calls-${viewport.width}.png`,fullPage:true});
    await page.goto('http://127.0.0.1:3187/speed-to-lead');
    await page.getByRole('heading',{name:'Capture-to-Delivery Mean',exact:true}).waitFor();checks++;
    assert.equal(await page.getByRole('heading',{level:1}).textContent(),'Delivery & First-Dial Timing');checks++;
    await page.getByRole('columnheader',{name:'Transaction Rows',exact:true}).waitFor();checks++;
    await page.getByRole('rowheader',{name:'0–5 Whole Minutes',exact:true}).waitFor();checks++;
    assert.equal(await page.getByText('1,250%',{exact:true}).count(),0);checks++;
    await page.screenshot({path:`verification/naming-timing-${viewport.width}.png`,fullPage:true});
"""
assert needle in s
s=s.replace(needle,insert+needle)
p.write_text(s)
# These expected blobs were computed independently from the amended local source.
p=R/'.maintenance/naming/expected.json'
m=json.loads(p.read_text())
m.update({'contracts/legacyMetrics.ts':'8ffdf2a5459e5680551a2b3f773ef796e022f9b4','src/pages/CallPerformance.tsx':'c61ad23e87b2f7e4f36c6c95df6a26f594fd0745','src/pages/SpeedToLead.tsx':'b89585f0eab4efa774986f98c02319e9eef43aa8','tooling/browser/smoke.mjs':'9ae7fd41e4c35a0eec25bfcdb9310cb4840053e0'})
p.write_text(json.dumps(m,indent=2)+'\n')
