from pathlib import Path
import json
R=Path.cwd()
p=R/'src/components/GlobalFilter.tsx';s=p.read_text()
s=s.replace("{booleanSelect('valid_lead','Lead Validity')}", """{booleanSelect('valid_lead','Lead Validity')}{booleanSelect('valid_idno','Recorded National ID Validity')}{booleanSelect('phone_valid','Recorded Phone Validity')}
      <label className="cx-field"><span>Recorded Call Attempts</span><select value={filters.calls?.operator==='equals'?String(filters.calls.value):filters.calls?.operator==='between'?`${filters.calls.min}-${filters.calls.max}`:''}
        onChange={e=>{const val=e.target.value;if(!val)setFilter('calls',null);else if(val.includes('-')){const [min,max]=val.split('-').map(Number);setFilter('calls',{operator:'between',min,max});}else setFilter('calls',{operator:'equals',value:Number(val)});}}>
        <option value="">All attempt counts</option><option value="0">0 recorded attempts</option><option value="1">1 recorded attempt</option><option value="2">2 recorded attempts</option><option value="3-5">3–5 recorded attempts</option><option value="6-10">6–10 recorded attempts</option>
      </select></label>""")
p.write_text(s)
p=R/'tests/presentation.test.ts';p.write_text(p.read_text()+'''
test('streamlined filters retain call-attempt, ID and phone controls',()=>{
  const source=read('src/components/GlobalFilter.tsx');
  assert.match(source,/Recorded Call Attempts/);assert.match(source,/booleanSelect\\('valid_idno'/);assert.match(source,/booleanSelect\\('phone_valid'/);
  assert.match(source,/operator:'between',min,max/);assert.match(source,/value:Number\\(val\\)/);
});
''')
p=R/'tooling/browser/smoke.mjs';s=p.read_text()
s=s.replace("    const requestsBefore=requestCounts['/api/analytics/calls']||0;", """    await page.getByText('Validation and outcome filters',{exact:true}).click();
    await page.getByRole('combobox',{name:'Recorded Call Attempts',exact:true}).selectOption('1');
    await page.getByRole('button',{name:'Remove calls filter',exact:true}).waitFor();
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).calls,{operator:'equals',value:1});checks++;
    await page.getByRole('combobox',{name:'Recorded Call Attempts',exact:true}).selectOption('3-5');
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).calls,{operator:'between',min:3,max:5});checks++;
    await page.getByRole('combobox',{name:'Recorded National ID Validity',exact:true}).selectOption('false');
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).valid_idno,{operator:'equals',value:false});checks++;
    await page.getByRole('combobox',{name:'Recorded Phone Validity',exact:true}).selectOption('true');
    assert.deepEqual(JSON.parse(new URL(page.url()).searchParams.get('filters')).phone_valid,{operator:'equals',value:true});checks++;
    await page.getByRole('button',{name:'Clear filters',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'Recorded Call Attempts',exact:true}).inputValue(),'');checks++;
    await page.screenshot({path:`verification/frontend-filters-${viewport.width}.png`,fullPage:true});
    const requestsBefore=requestCounts['/api/analytics/calls']||0;""")
p.write_text(s)
p=R/'.maintenance/frontend/expected.json';m=json.loads(p.read_text());m.update({'src/components/GlobalFilter.tsx':'a16777b325a9273277c32a7fc61f06114081c8ca','tests/presentation.test.ts':'42b2f55107584dea35755ccadfcb0381c9f95635','tooling/browser/smoke.mjs':'187a459aa8026356bcf81a12a3b8236a2e53281e'});p.write_text(json.dumps(m,indent=2)+'\n')
