import React, { memo, useRef, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend, ReferenceLine } from 'recharts';
import { type ExploreRow, type ExploreView, formatValue, METRICS, donutRows, pivotSeries, TEMPORAL, seriesLabel } from '../../lib/explore/model';
import { exactLabel, plotCoordinate } from '../../lib/visuals/model';
import { categoryColour, CHART_PALETTE as PALETTE } from '../../lib/visuals/palette';
const tone=(label:string)=>categoryColour(String(seriesLabel(label)));
const axis=(v:unknown)=>typeof v==='number'?new Intl.NumberFormat('en-GB',{notation:'compact',maximumFractionDigits:1}).format(v):String(v??'');
interface Props { rows:ExploreRow[]; view:ExploreView; currency:string; limit:number; selectedSeries:string[]; onInspect:(row:ExploreRow)=>void; context:string; }
function ExploreChart({rows,view,currency,limit,selectedSeries,onInspect,context}:Props){
  const ref=useRef<HTMLElement>(null),[notice,setNotice]=useState('');
  const metric=METRICS.find(m=>m.id===view.metric)!,pie=view.chart==='donut',temporal=TEMPORAL.has(view.dimension);
  const timeRows=temporal?[...rows].sort((a,b)=>String(a.dim1).localeCompare(String(b.dim1),undefined,{numeric:true})):rows;
  const shown=pie?donutRows(rows,Math.min(limit,10)):timeRows.slice(0,limit);
  const points=shown.map(r=>({...r,coordinate:plotCoordinate(r.value)}));
  const hasSeries=!!view.secondary&&['line','area'].includes(view.chart);
  const pivot=hasSeries?pivotSeries(rows,selectedSeries).slice(0,limit):[];
  const timeSeriesRows: {label:string; points:Record<string,ExploreRow>; coordinate?:number|null}[] = hasSeries ? pivot : points.map(point=>({...point,points:{coordinate:point}}));
  const series=hasSeries?selectedSeries.map((label,i)=>({key:`v${i}`,label:seriesLabel(label),colour:tone(label)})):[{key:'coordinate',label:metric.label,colour:PALETTE[0]}];
  const height=view.chart==='bar'?Math.max(300,Math.min(points.length*37+60,1300)):365;
  const click=(p:any)=>{const row=p?.payload||p;if(row?.key&&row.key!=='__explicit_other__')onInspect(row);};
  const tooltip=({active,payload}:any)=>{
    if(!active||!payload?.length)return null;const point=payload[0].payload;
    return <div className="cx-explore-tooltip"><strong>{point.label}</strong>{hasSeries?series.map(s=><p key={s.key}>{s.label}: {formatValue(point.points[s.key]?.value??null,view.metric,currency)}</p>):<><p>{formatValue(point.value,view.metric,currency)}</p><small>Reported sample: {exactLabel(point.sampleSize)}</small></>}<small>Values from this response; not independently reconciled.</small></div>;
  };
  const grid=<CartesianGrid stroke="#e2e9ef" strokeDasharray="3 5" vertical={false}/>;
  const x=<XAxis dataKey="label" tick={{fontSize:11}} tickFormatter={v=>String(v).length>21?String(v).slice(0,19)+'…':String(v)} minTickGap={22}/>;
  const y=<YAxis tickFormatter={axis} tick={{fontSize:11}} width={70} domain={[(min:number)=>Math.min(0,min),(max:number)=>Math.max(0,max)]}/>;
  const tips=<Tooltip content={tooltip}/>;
  let chart:React.ReactNode;
  if(view.chart==='line')chart=<LineChart data={timeSeriesRows} margin={{top:20,right:22,bottom:15,left:0}} accessibilityLayer>{grid}{x}{y}<ReferenceLine y={0} stroke="#9dafbf"/>{tips}<Legend wrapperStyle={{fontSize:11}}/>{series.map(s=><Line key={s.key} dataKey={s.key} name={s.label} stroke={s.colour} strokeWidth={2.5} type="linear" connectNulls={false} dot={false} isAnimationActive={false}/>)}</LineChart>;
  else if(view.chart==='area')chart=<AreaChart data={timeSeriesRows} margin={{top:20,right:22,bottom:15,left:0}} accessibilityLayer>{grid}{x}{y}{tips}<Legend wrapperStyle={{fontSize:11}}/>{series.map(s=><Area key={s.key} dataKey={s.key} name={s.label} stroke={s.colour} fill={s.colour} fillOpacity={.12} strokeWidth={2} type="linear" connectNulls={false} isAnimationActive={false}/>)}</AreaChart>;
  else if(pie)chart=<PieChart><Pie data={points.filter(p=>p.coordinate!==null&&p.coordinate>0)} nameKey="label" dataKey="coordinate" innerRadius="48%" outerRadius="80%" isAnimationActive={false} onClick={click}>{points.filter(p=>p.coordinate!==null&&p.coordinate>0).map(p=><Cell key={p.key} fill={tone(p.label)}/>)}</Pie>{tips}</PieChart>;
  else if(view.chart==='column')chart=<BarChart data={points} margin={{top:20,right:22,bottom:15,left:0}} accessibilityLayer>{grid}{x}{y}{tips}<ReferenceLine y={0} stroke="#9dafbf"/><Bar dataKey="coordinate" name={metric.label} fill={PALETTE[0]} radius={[4,4,0,0]} maxBarSize={45} isAnimationActive={false} onClick={click}/></BarChart>;
  else chart=<BarChart data={points} layout="vertical" margin={{top:12,right:28,bottom:14,left:4}} accessibilityLayer><CartesianGrid stroke="#e2e9ef" strokeDasharray="3 5" horizontal={false}/><XAxis type="number" tick={{fontSize:11}} tickFormatter={axis}/><YAxis type="category" dataKey="label" width={128} tick={{fontSize:11}} interval={0} tickFormatter={v=>String(v).length>23?String(v).slice(0,21)+'…':String(v)}/>{tips}<ReferenceLine x={0} stroke="#9dafbf"/><Bar dataKey="coordinate" name={metric.label} fill={PALETTE[0]} radius={[0,4,4,0]} maxBarSize={24} isAnimationActive={false} onClick={click}/></BarChart>;
  const hasValues=hasSeries?pivot.some(p=>series.some(s=>(p as any)[s.key]!==null)):points.some(p=>p.coordinate!==null&&Number.isFinite(p.coordinate));
  return <section ref={ref} className="cx-explore-chart" aria-label="Explore visual">
    <div className="cx-explore-chart-heading"><div><h2>{metric.label}</h2><p>{temporal?'Capture-ordered data. Missing periods and values are not imputed.':'One mark per returned group. Select a mark or inspect its table row.'}</p></div><button type="button" className="cx-button-secondary" onClick={async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await ref.current?.requestFullscreen();}catch{setNotice('Full screen is not available in this browser.');}}}>Full screen</button></div>
    <p className="cx-explore-caption">{pie?'Share of returned matching groups; remaining positive counts are grouped explicitly as Other.':`${hasSeries?pivot.length:shown.length} ${hasSeries?'capture periods':'groups'} displayed from ${rows.length} matching returned groups.`} {hasSeries?`${selectedSeries.length} comparison series selected.`:''} Axes use compact values; details and exports retain received precision.</p>
    <div className="cx-explore-plot-scroll">{hasValues?<div role="img" aria-label={`${view.chart}: ${metric.label}`} style={{height,width:'100%',minWidth:0}}><ResponsiveContainer width="100%" height="100%" debounce={50}>{chart as any}</ResponsiveContainer></div>:<div className="cx-explore-empty">No plottable values. Unavailable values have not become zero.</div>}</div>
    {pie&&<div className="cx-explore-pie-legend">{shown.map(r=><button key={r.key} type="button" disabled={r.key==='__explicit_other__'} onClick={()=>onInspect(r)}><i style={{background:tone(r.label)}}/><span>{r.label}</span><strong>{formatValue(r.value,view.metric,currency)}</strong></button>)}</div>}
    <p className="cx-explore-caption">{context}</p>{notice&&<p role="status">{notice}</p>}
  </section>;
}
export default memo(ExploreChart);
