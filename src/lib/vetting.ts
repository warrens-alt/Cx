import { countRatio, periodChange, VETTING_METRICS, type VettingGroup, type VettingMetric, type VettingReport } from '../../contracts/vetting';
import { compareExactDecimal } from './breakdown';
import type { VisualDataset } from './visuals/model';
import { categoryColour } from './visuals/palette';
export const VETTING_MEASURES = [
  {key:'leads', label:'Included Leads', unit:'leads'},
  {key:'share', label:'Share of Included Leads (%)', unit:'percent'},
  {key:'delivered', label:VETTING_METRICS.delivered, unit:'leads'},
  {key:'called', label:VETTING_METRICS.called, unit:'leads'},
  {key:'rpc', label:VETTING_METRICS.rpc, unit:'leads'},
  {key:'sales', label:VETTING_METRICS.sales, unit:'leads'},
  {key:'activations', label:VETTING_METRICS.activations, unit:'leads'},
  {key:'saleShare', label:'Sale-Evidenced / Included Leads (%)', unit:'percent'},
  {key:'activationShare', label:'Activation-Evidenced / Included Leads (%)', unit:'percent'},
  {key:'classMeanSeconds', label:'Mean Capture-to-Class Delay (Seconds)', unit:'seconds'},
  {key:'colourMeanSeconds', label:'Mean Capture-to-Colour Delay (Seconds)', unit:'seconds'},
];
export function selectedGroups(report:VettingReport,section:VettingGroup['section'],period:'current'|'previous'='current'){
  return report.groups.filter(g=>g.section===section&&g.period===period);
}
export function decorateGroup(row:VettingGroup,report:VettingReport){
  const total=row.period==='current'?report.current:report.previous;
  return {...row,label:row.series?`${row.key} · ${row.series}`:row.key,share:countRatio(row.leads,total.leads),saleShare:countRatio(row.sales,row.leads),activationShare:countRatio(row.activations,row.leads)};
}
export function groupDataset(rows:VettingGroup[],report:VettingReport,title:string):VisualDataset{
  return {id:`vetting.${title}`,title,rows:rows.map(r=>decorateGroup(r,report)),defaultDimension:'label',defaultMeasure:'leads',
    dimensions:[{key:'label',label:'Classification / Segment'}],measures:VETTING_MEASURES,
    note:'One API aggregate per point. Rates use the named included-lead denominator. Source HLC evidence is not independently reconciled. Vendor groups can overlap.'};
}
export function classMovement(report:VettingReport,section:'class'|'colour'){
  const current=selectedGroups(report,section),previous=selectedGroups(report,section,'previous');
  const map=new Map(current.map(r=>[r.key,r])),old=new Map(previous.map(r=>[r.key,r]));
  return [...new Set([...map.keys(),...old.keys()])].map(key=>{
    const c=map.get(key)?.leads??'0',p=old.get(key)?.leads??'0',change=periodChange(c,p);
    return {key,current:c,previous:p,delta:change.delta,changePercent:change.percent,currentShare:countRatio(c,report.current.leads),previousShare:countRatio(p,report.previous.leads)};
  }).sort((a,b)=>compareExactDecimal(b.current,a.current));
}
export function colourFill(label:string,_index=0){
  return categoryColour(label);
}
export function csvText(headers:string[],rows:unknown[][]){
  const cell=(v:unknown)=>{const text=String(v??'');const protectedText=/^[\s\uFEFF]*[=+@]/.test(text)||(/^\s*-/.test(text)&&! /^-?\d+(\.\d+)?$/.test(text))?`'${text}`:text;return `"${protectedText.replace(/"/g,'""')}"`;};
  return '\uFEFF'+[headers,...rows].map(row=>row.map(cell).join(',')).join('\r\n');
}
export function downloadVetting(text:string,name:string,mime='text/csv;charset=utf-8'){
  const url=URL.createObjectURL(new Blob([text],{type:mime}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function summaryLine(report:VettingReport){
  if(report.current.leads==='0')return 'No unambiguous lead records match this selection. Clear class/colour selections or change the capture window.';
  const named=countRatio(report.current.namedColour,report.current.leads),classified=countRatio(report.current.classRecorded,report.current.leads);
  const delta=periodChange(report.current.leads,report.previous.leads);
  return `${classified??'Unavailable'}${classified===null?'':'%'} have a recorded class; ${named??'Unavailable'}${named===null?'':'%'} have one recognised colour. ${delta.percent===null?'The prior window has no comparable percentage-change denominator.':`Included-lead volume changed ${delta.percent}% against the preceding ${report.scope.days}-day window.`} These are recorded associations, not evidence that vetting caused an outcome.`;
}
