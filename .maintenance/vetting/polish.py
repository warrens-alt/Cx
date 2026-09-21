from pathlib import Path
import json
r=Path.cwd()
p=r/'src/components/Modal.tsx';s=p.read_text();needle='    onCancel={event => { event.preventDefault(); close.current(); }}'
insert='''    onKeyDown={event => {
      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]'))
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }}
'''
assert needle in s;s=s.replace(needle,insert+needle);p.write_text(s)
p=r/'src/components/visuals/VettingChart.tsx';s=p.read_text();s="import { countRatio } from '../../../contracts/vetting';\n"+s
needle='    <details className="vetting-exact">'
insert='''    {pie&&<div className="vetting-pie-legend" aria-label={`${title} legend`}>{points.map((p,i)=><button type="button" key={`${p.__name}-${p.__row}`} disabled={!onSelect||p.__row<0} onClick={()=>click(p)} aria-label={`Filter ${title}: ${p.__name}`}><i aria-hidden="true" style={{background:colourFill(p.__name,i)}}/><span>{p.__name}</span><strong>{exactLabel(p[series[0].key])}<small>{countRatio(p[series[0].key]??null,points.reduce((n,r)=>n+BigInt(r[series[0].key]??'0'),0n).toString())??'Unavailable'}%</small></strong></button>)}</div>}
'''
assert needle in s;s=s.replace(needle,insert+needle);p.write_text(s)
p=r/'src/styles/vetting.css';p.write_text(p.read_text()+'''\n.vetting-pie-legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0 12px}.vetting-pie-legend button{display:flex;align-items:center;gap:7px;border:1px solid #e4ebf0;border-radius:7px;padding:9px;text-align:left;min-width:0;font-size:10px}.vetting-pie-legend button:disabled{opacity:1}.vetting-pie-legend i{width:8px;height:8px;border-radius:50%;flex-shrink:0}.vetting-pie-legend span{flex:1;min-width:0;overflow-wrap:anywhere}.vetting-pie-legend strong{font-variant-numeric:tabular-nums;text-align:right;flex-shrink:0}.vetting-pie-legend small{display:block;color:#718497;font-size:9px;font-weight:400}@media(max-width:440px){.vetting-pie-legend{grid-template-columns:minmax(0,1fr)}}
''')
p=r/'src/pages/Vetting.tsx';s=p.read_text().replace('Palette, ArrowUpRight, Download','Palette, ArrowUpRight, ArrowDownRight, Minus, Download');s=s.replace('<p><ArrowUpRight size={13}/>{change.percent',"<p>{change.delta?.startsWith('-')?<ArrowDownRight size={13}/>:change.delta==='0'?<Minus size={13}/>:<ArrowUpRight size={13}/>}{change.percent");p.write_text(s)
p=r/'.maintenance/vetting/expected.json';m=json.loads(p.read_text())
m.update({'src/components/Modal.tsx':'0d0e69b41e3ebbdd1b298bc81cc0a8e26acca297','src/components/visuals/VettingChart.tsx':'25f3c61d5ed9213ad436b1aaf25bcb8017811285','src/styles/vetting.css':'42c31627c662a06e3306e9ccddbadc03c5e75aac','src/pages/Vetting.tsx':'7fc0cd197d9c6281fdcc7d8a11d2358173a5e381'})
p.write_text(json.dumps(m,indent=2)+'\n')
