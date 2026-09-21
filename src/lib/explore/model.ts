import { EXPLORER_METRICS } from '../../../contracts/legacyMetrics';
import { DIMENSION_LABELS } from '../../../contracts/naming';
import { compareExactDecimal } from '../breakdown';
import { decimal, exactLabel, plotCoordinate } from '../visuals/model';

/** Presentation contract only: this module never issues SQL or changes metric definitions. */
export const METRICS = EXPLORER_METRICS;
export const DIMENSIONS = [
  ...Object.entries(DIMENSION_LABELS).filter(([id]) => id !== 'vendor').map(([id,label]) => ({id,label})),
  {id:'grade',label:'Recorded Lead Class'}, {id:'vetting',label:'Recorded Vetting Result'},
];
export const TEMPORAL = new Set(['date','week','month','hour','weekday']);
export type Chart = 'bar' | 'column' | 'line' | 'area' | 'donut' | 'table';
export type Sort = 'value_desc' | 'value_asc' | 'label' | 'sample_desc';
export interface ExploreView { metric:string; dimension:string; secondary:string; chart:Chart; }
export const DEFAULT_VIEW: ExploreView = {metric:'leads',dimension:'source',secondary:'',chart:'bar'};
const VIEW_KEYS = ['exMetric','exDimension','exSecondary','exChart'] as const;
export const PRESETS: {id:string; title:string; description:string; view:ExploreView}[] = [
  {id:'supply',title:'Lead supply',description:'Where lead volume comes from',view:{...DEFAULT_VIEW}},
  {id:'trend',title:'Capture trend',description:'Daily lead volume by source',view:{metric:'leads',dimension:'date',secondary:'source',chart:'line'}},
  {id:'sales',title:'Sales efficiency',description:'Sales / dialled leads by source',view:{metric:'sale_rate',dimension:'source',secondary:'',chart:'bar'}},
  {id:'class',title:'Class results',description:'Recorded lead classes by source',view:{metric:'leads',dimension:'grade',secondary:'source',chart:'column'}},
];
export function validateView(input: ExploreView): ExploreView {
  if (!METRICS.some(m=>m.id===input.metric)) throw new Error('Unknown Explore measure. Reset the Explore view.');
  if (!DIMENSIONS.some(d=>d.id===input.dimension) || input.secondary && !DIMENSIONS.some(d=>d.id===input.secondary)) throw new Error('Unsupported Explore dimension. Vendor grouping belongs in the vendor reports.');
  if (input.secondary===input.dimension) throw new Error('Choose two different breakdown dimensions.');
  if (!['bar','column','line','area','donut','table'].includes(input.chart)) throw new Error('Unknown visualisation. Reset the Explore view.');
  return input;
}
export function readExploreView(params:URLSearchParams):ExploreView {
  for(const key of VIEW_KEYS) if(params.getAll(key).length>1) throw new Error(`Repeated Explore parameter: ${key}`);
  return validateView({metric:params.get('exMetric')??DEFAULT_VIEW.metric,dimension:params.get('exDimension')??DEFAULT_VIEW.dimension,
    secondary:params.get('exSecondary')??'',chart:(params.get('exChart')??DEFAULT_VIEW.chart) as Chart});
}
export function writeExploreView(previous:URLSearchParams,view:ExploreView,dates:{startDate:string;endDate:string}):URLSearchParams {
  validateView(view);
  const next=new URLSearchParams(previous);
  [view.metric,view.dimension,view.secondary,view.chart].forEach((v,i)=>{v?next.set(VIEW_KEYS[i],v):next.delete(VIEW_KEYS[i]);});
  if(!next.has('startDate')) next.set('startDate',dates.startDate);
  if(!next.has('endDate')) next.set('endDate',dates.endDate);
  return next;
}
export function resetExploreView(previous:URLSearchParams){const next=new URLSearchParams(previous);VIEW_KEYS.forEach(k=>next.delete(k));return next;}
export function safeChart(view:ExploreView,rows?:ExploreRow[]):Chart {
  if (['line','area'].includes(view.chart) && !TEMPORAL.has(view.dimension)) return 'bar';
  if (view.chart==='donut' && !canDonut(view,rows)) return 'bar';
  return view.chart;
}
export function canDonut(view:ExploreView,rows?:ExploreRow[]){
  const metric=METRICS.find(m=>m.id===view.metric);
  return !view.secondary && !!metric?.additive && metric.unit==='records' && !TEMPORAL.has(view.dimension)
    && (!rows || rows.length>0 && rows.every(r=>r.value!==null && /^\+?\d+$/.test(r.value)) && rows.some(r=>BigInt(r.value!)>0n));
}
export interface ExploreRow {
  key:string; dim1:string|null; dim2:string|null; label:string; value:string|null; sampleSize:string|null;
  fullFunnel:Record<string,string|null>; precisionWarning:boolean;
}
export interface ExploreResult { rows:ExploreRow[]; metadata:Record<string,any>; receivedAt:string; }
const text=(v:unknown)=>v===null||v===undefined?null:typeof v==='string'||typeof v==='number'?String(v):null;
function numeric(v:unknown):{value:string|null;warning:boolean}{
  const invalid = v!==null&&v!==undefined&&decimal(v)===null;
  return {value:decimal(v),warning:invalid || typeof v==='number' && (Math.abs(v)>Number.MAX_SAFE_INTEGER || !Number.isInteger(v))};
}
export function normalizeResponse(body:any,expected:{metric:string;dimension:string;secondary?:string;clientId:string}):ExploreResult {
  if(body?.success!==true) throw new Error(typeof body?.error==='string'?body.error:'Explore returned an unsuccessful response.');
  const raw = Array.isArray(body.data)?body.data:Array.isArray(body.data?.data)?body.data.data:null;
  if(!raw) throw new Error('Explore response is missing its result rows. No empty report was substituted.');
  if(raw.length>1000) throw new Error('Explore returned more rows than its supported response contract.');
  const metadata={...(body.data?.metadata||{}),...(body.metadata||{})};
  for(const key of ['metric','dimension','clientId'] as const) if(metadata[key]!==undefined&&metadata[key]!==expected[key]) throw new Error(`Explore response ${key} does not match this request.`);
  if(metadata.secondaryDimension!==undefined&&String(metadata.secondaryDimension||'')!==(expected.secondary||'')) throw new Error('Explore response comparison does not match this request.');
  const seen=new Set<string>();
  const rows=raw.map((r:any):ExploreRow=>{
    if(!r||typeof r!=='object'||!Object.hasOwn(r,'dim1')||!Object.hasOwn(r,'value')) throw new Error('Explore returned a malformed group.');
    for(const dimension of [r.dim1,...(expected.secondary?[r.dim2]:[])]){
      if(dimension!==null&&dimension!==undefined&&typeof dimension!=='string'&&typeof dimension!=='number')throw new Error('Explore returned a non-scalar group dimension.');
      if(typeof dimension==='number'&&!Number.isFinite(dimension))throw new Error('Explore returned an invalid numeric dimension.');
    }
    const dim1=text(r.dim1),dim2=expected.secondary?text(r.dim2):null,key=JSON.stringify([dim1,dim2]);
    if(expected.secondary&&!Object.hasOwn(r,'dim2')) throw new Error('The secondary breakdown is missing from the response.');
    if(seen.has(key)) throw new Error('Explore returned duplicate group keys; no values were combined.');seen.add(key);
    const value=numeric(r.value),sample=numeric(r.sampleSize);
    if(sample.value!==null&&!/^\+?\d+$/.test(sample.value)) throw new Error('Explore returned an invalid sample count.');
    const funnel=Object.fromEntries(Object.entries(r.fullFunnel||{}).map(([k,v])=>[k,decimal(v)]));
    return {key,dim1,dim2,label:[dim1??'Unspecified',...(expected.secondary?[dim2??'Unspecified']:[])].join(' · '),value:value.value,sampleSize:sample.value,fullFunnel:funnel,precisionWarning:value.warning||sample.warning};
  });
  return {rows,metadata,receivedAt:new Date().toISOString()};
}
function parts(s:string){const neg=s[0]==='-',[whole,fraction='']=s.replace(/^[+-]/,'').split('.');return {n:BigInt(whole+fraction)*(neg?-1n:1n),scale:fraction.length};}
export function sumExact(values:(string|null)[]):string|null {
  if(!values.length||values.some(v=>v===null))return null;
  const p=values.map(v=>parts(v!)),scale=Math.max(...p.map(v=>v.scale));
  const sum=p.reduce((n,v)=>n+v.n*10n**BigInt(scale-v.scale),0n),sign=sum<0n?'-':'',digits=(sum<0n?-sum:sum).toString().padStart(scale+1,'0');
  return sign+(scale?digits.slice(0,-scale)+'.'+digits.slice(-scale):digits);
}
export function formatValue(value:string|null,metricId:string,currency='ZAR'){
  if(value===null)return 'Unavailable';const unit=METRICS.find(m=>m.id===metricId)?.unit;
  return (unit==='currency'?currency+' ':'')+exactLabel(value)+(unit==='percent'?'%':'');
}
export function selectRows(rows:ExploreRow[],search:string,sort:Sort,minSample:string):ExploreRow[]{
  const term=search.trim().toLocaleLowerCase('en-GB'),min=/^\d{1,12}$/.test(minSample)?BigInt(minSample):0n;
  const collator=new Intl.Collator('en-GB',{numeric:true});
  return rows.filter(r=>(!term||r.label.toLocaleLowerCase('en-GB').includes(term))&&(min===0n||r.sampleSize!==null&&BigInt(r.sampleSize)>=min))
    .sort((a,b)=>{
      if(sort==='label')return collator.compare(a.label,b.label)||a.key.localeCompare(b.key);
      const av=sort==='sample_desc'?a.sampleSize:a.value,bv=sort==='sample_desc'?b.sampleSize:b.value;
      if(av===null||bv===null)return av===bv?a.key.localeCompare(b.key):av===null?1:-1;
      return compareExactDecimal(av,bv)*(sort==='value_asc'?1:-1)||collator.compare(a.label,b.label)||a.key.localeCompare(b.key);
    });
}
export const seriesKey=(value:string|null)=>JSON.stringify(value);
export const seriesLabel=(key:string):string=>{try{return JSON.parse(key)??'Unspecified';}catch{return key;}};
export function seriesNames(rows:ExploreRow[]){return [...new Set(rows.map(r=>seriesKey(r.dim2)))].sort((a,b)=>new Intl.Collator('en-GB',{numeric:true}).compare(seriesLabel(a),seriesLabel(b)));}
export function pivotSeries(rows:ExploreRow[],selected:string[]){
  const map=new Map<string,{label:string;points:Record<string,ExploreRow>}>();
  for(const r of rows){const key=JSON.stringify(r.dim1),label=r.dim1??'Unspecified',entry=map.get(key)||{label,points:{}};const i=selected.indexOf(seriesKey(r.dim2));
    if(i>=0)entry.points[`v${i}`]=r;map.set(key,entry);}
  return [...map.values()].sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true})).map(r=>({...r,...Object.fromEntries(selected.map((_,i)=>[`v${i}`,r.points[`v${i}`]?.value===null||r.points[`v${i}`]===undefined?null:plotCoordinate(r.points[`v${i}`].value)]))}));
}
export function donutRows(rows:ExploreRow[],limit:number):ExploreRow[]{
  const sorted=selectRows(rows,'','value_desc','0');
  if(sorted.length<=limit)return sorted;
  return [...sorted.slice(0,limit),{key:'__explicit_other__',dim1:null,dim2:null,label:`Other (${sorted.length-limit} returned groups)`,
    value:sumExact(sorted.slice(limit).map(r=>r.value)),sampleSize:null,fullFunnel:{},precisionWarning:false}];
}
const csvCell=(value:unknown)=>{const s=String(value??'');const safe=/^[\s\uFEFF]*[=+@]/.test(s)||(/^\s*-/.test(s)&&decimal(s)===null)||/^[\t\r\n]/.test(s)?"'"+s:s;return '"'+safe.replace(/"/g,'""')+'"';};
export function exportCsv(rows:ExploreRow[],view:ExploreView,context:Record<string,unknown>){
  const metric=METRICS.find(m=>m.id===view.metric)!;
  const headers=[DIMENSIONS.find(d=>d.id===view.dimension)!.label,...(view.secondary?[DIMENSIONS.find(d=>d.id===view.secondary)!.label]:[]),metric.label,'Reported Sample Size','Export Context'];
  return '\uFEFF'+[headers,...rows.map(r=>[r.dim1,...(view.secondary?[r.dim2]:[]),r.value,r.sampleSize,JSON.stringify(context)])].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
export function saveFile(content:string,name:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
