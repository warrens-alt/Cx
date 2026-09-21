import { countRatio } from '../../../contracts/vetting';
import React, { useMemo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { colourFill, csvText, downloadVetting } from '../../lib/vetting';
import { compareExactDecimal } from '../../lib/breakdown';
import { exactLabel, decimal } from '../../lib/visuals/model';
export interface VettingSeries { key:string; label:string; colour?:string; }
type Kind='bar'|'column'|'line'|'area'|'pie'|'donut';
interface Props { title:string; description:string; rows:Record<string,any>[]; series:VettingSeries[]; unit?:string; ordered?:boolean; disjoint?:boolean; initial?:Kind; onSelect?:(name:string)=>void; }
const axis=(v:unknown)=>typeof v==='number'?new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(v):String(v??'');
export default function VettingChart({title,description,rows,series,unit='leads',ordered=false,disjoint=false,initial='bar',onSelect}:Props){
  const [kind,setKind]=useState<Kind>(initial),[limit,setLimit]=useState(ordered?366:12),[expanded,setExpanded]=useState(false),[notice,setNotice]=useState('');
  const host=useRef<HTMLElement>(null),pie=kind==='pie'||kind==='donut';
  const points=useMemo(()=>{
    const copied=rows.map((r,index)=>({...r,__row:index,__name:String(r.label??r.key??''),...Object.fromEntries(series.map((s,i)=>[`__v${i}`,decimal(r[s.key])===null?null:Number(r[s.key])]))}));
    if(ordered)copied.sort((a,b)=>a.__name.localeCompare(b.__name));
    else copied.sort((a,b)=>compareExactDecimal(String(b[series[0].key]??'-1'),String(a[series[0].key]??'-1')));
    if(pie&&copied.length>limit){
      const rest=copied.slice(limit);const sum=rest.reduce((n,r)=>n+BigInt(r[series[0].key]??'0'),0n).toString();
      return [...copied.slice(0,limit),{__name:`Other (${rest.length} categories)`,__row:-1,[series[0].key]:sum,__v0:Number(sum)}];
    }
    return copied.slice(0,limit);
  },[rows,series,ordered,pie,limit]);
  const kindAllowed=(k:Kind)=>!(['line','area'].includes(k)&&!ordered)&&!(['pie','donut'].includes(k)&&(!disjoint||series.length!==1||unit!=='leads'));
  const effective=kindAllowed(kind)?kind:(ordered?'line':'bar');
  const precision=rows.some(r=>series.some(s=>String(r[s.key]??'').replace(/[-.]/g,'').length>14));
  const details=({active,payload}:any)=>{if(!active||!payload?.length)return null;const r=payload[0].payload;return <div className="cx-viz-tooltip"><strong>{r.__name}</strong>{series.map(s=><p key={s.key}>{s.label}: <b>{exactLabel(r[s.key])}{unit==='percent'&&r[s.key]!=null?'%':''}</b></p>)}</div>;};
  const click=(item:any)=>{const r=item?.payload||item;if(r?.__row>=0)onSelect?.(r.__name);};
  const grid=<CartesianGrid strokeDasharray="3 4" vertical={false} stroke="#dce5ec"/>;
  const x=<XAxis dataKey="__name" tick={{fontSize:11}} tickFormatter={v=>String(v).length>19?String(v).slice(0,17)+'…':String(v)} minTickGap={18}/>;
  const y=<YAxis tickFormatter={axis} width={60} tick={{fontSize:11}} domain={[0,'auto']}/>;
  const tooltip=<Tooltip content={details}/>;
  const legend=<Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>;
  let chart:React.ReactNode;
  if(effective==='pie'||effective==='donut')chart=<PieChart><Pie data={points.filter(p=>Number(p.__v0)>0)} nameKey="__name" dataKey="__v0" innerRadius={effective==='donut'?'42%':0} outerRadius="76%" isAnimationActive={false} onClick={click}>{points.filter(p=>Number(p.__v0)>0).map((p,i)=><Cell key={p.__name} fill={colourFill(p.__name,i)}/>)}</Pie>{tooltip}</PieChart>;
  else if(effective==='line')chart=<LineChart data={points} margin={{top:16,right:20,bottom:16,left:0}} accessibilityLayer>{grid}{x}{y}{tooltip}{legend}{series.map((s,i)=><Line key={s.key} dataKey={`__v${i}`} name={s.label} stroke={s.colour||colourFill('',i)} strokeWidth={2.5} type="linear" connectNulls={false} dot={points.length<35?{r:3}:false} isAnimationActive={false}/>)}</LineChart>;
  else if(effective==='area')chart=<AreaChart data={points} margin={{top:16,right:20,bottom:16,left:0}} accessibilityLayer>{grid}{x}{y}{tooltip}{legend}{series.map((s,i)=><Area key={s.key} dataKey={`__v${i}`} name={s.label} stroke={s.colour||colourFill('',i)} fill={s.colour||colourFill('',i)} fillOpacity={.1} type="linear" connectNulls={false} isAnimationActive={false}/>)}</AreaChart>;
  else if(effective==='column')chart=<BarChart data={points} margin={{top:16,right:20,bottom:16,left:0}} accessibilityLayer>{grid}{x}{y}{tooltip}{legend}{series.map((s,i)=><Bar key={s.key} dataKey={`__v${i}`} name={s.label} fill={s.colour||colourFill('',i)} maxBarSize={40} isAnimationActive={false} onClick={click}/>)}</BarChart>;
  else chart=<BarChart data={points} layout="vertical" margin={{top:8,right:20,bottom:16,left:0}} accessibilityLayer><CartesianGrid horizontal={false} strokeDasharray="3 4" stroke="#dce5ec"/><XAxis type="number" tickFormatter={axis} tick={{fontSize:11}}/><YAxis dataKey="__name" type="category" width={122} tick={{fontSize:11}} tickFormatter={v=>String(v).length>19?String(v).slice(0,17)+'…':String(v)} interval={0}/>{tooltip}{legend}{series.map((s,i)=><Bar key={s.key} dataKey={`__v${i}`} name={s.label} fill={s.colour||colourFill('',i)} maxBarSize={23} isAnimationActive={false} onClick={click}>{disjoint&&series.length===1&&points.map((p,j)=><Cell key={p.__name} fill={colourFill(p.__name,j)}/>)}</Bar>)}</BarChart>;
  const chartHeight=expanded?560:effective==='bar'?Math.max(290,Math.min(points.length*38+55,510)):320;
  return <section ref={host} className="vetting-chart enterprise-card" aria-label={title}>
    <header><div><h2>{title}</h2><p>{description}</p></div><div className="vetting-chart-actions"><button type="button" onClick={()=>setExpanded(x=>!x)} aria-pressed={expanded}>{expanded?'Compact':'Expand'}</button><button type="button" onClick={async()=>{try{await host.current?.requestFullscreen();}catch{setNotice('Full screen is unavailable in this browser.');}}}>Full screen</button></div></header>
    <div className="vetting-chart-controls"><label>Visual<select aria-label={`${title} chart type`} value={effective} onChange={e=>setKind(e.target.value as Kind)}>{(['bar','column','line','area','pie','donut'] as Kind[]).map(k=><option key={k} value={k} disabled={!kindAllowed(k)}>{({bar:'Horizontal bars',column:'Columns',line:'Line graph',area:'Area graph',pie:'Pie chart',donut:'Doughnut'})[k]}</option>)}</select></label>
      <label>{ordered?'Periods':'Categories'}<select aria-label={`${title} point limit`} value={limit} onChange={e=>setLimit(Number(e.target.value))}>{[12,25,50,100,366].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
      <button type="button" onClick={()=>downloadVetting(csvText(['Category',...series.map(s=>s.label),'Scope'],points.map(p=>[p.__name,...series.map(s=>p[s.key]),description])),`vetting-${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.csv`)}>Export plotted CSV</button>
    </div>
    <p className="vetting-chart-caption">{pie?'Complete distribution; remaining categories are grouped explicitly as Other.':`Showing ${points.length} of ${rows.length} returned ${ordered?'periods':'groups'}.`} {ordered?'Missing calendar rows are not imputed; periods are capture-dated.':''} {precision?'Plot coordinates are approximate; exact values remain below.':''}</p>
    {!points.some(p=>series.some((_,i)=>p[`__v${i}`]!=null&&(!pie||Number(p[`__v${i}`])>0)))?<div role="status" className="vetting-empty">{rows.length?'No plottable values for this measure. Zero and unavailable values remain distinct in the exact data.':'No groups match this selection.'}</div>:<div role="img" aria-label={`${effective}: ${title}`} className="vetting-canvas" style={{height:chartHeight}}><ResponsiveContainer width="100%" height="100%" debounce={50}>{chart as any}</ResponsiveContainer></div>}
    {pie&&<div className="vetting-pie-legend" aria-label={`${title} legend`}>{points.map((p,i)=><button type="button" key={`${p.__name}-${p.__row}`} disabled={!onSelect||p.__row<0} onClick={()=>click(p)} aria-label={`Filter ${title}: ${p.__name}`}><i aria-hidden="true" style={{background:colourFill(p.__name,i)}}/><span>{p.__name}</span><strong>{exactLabel(p[series[0].key])}<small>{countRatio(p[series[0].key]??null,points.reduce((n,r)=>n+BigInt(r[series[0].key]??'0'),0n).toString())??'Unavailable'}%</small></strong></button>)}</div>}
    <details className="vetting-exact"><summary>Exact chart values ({points.length})</summary><ul>{points.map(p=><li key={`${p.__name}-${p.__row}`}><button type="button" disabled={!onSelect||p.__row<0} onClick={()=>click(p)}>{p.__name}</button><span>{series.map(s=>`${s.label}: ${exactLabel(p[s.key])}${unit==='percent'&&p[s.key]!=null?'%':''}`).join(' · ')}</span></li>)}</ul></details>{notice&&<p role="status">{notice}</p>}
  </section>;
}
