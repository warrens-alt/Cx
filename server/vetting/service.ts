import { COUNT_KEYS, VETTING_SECTIONS, VETTING_VERSION, type VettingMetric, type VettingCounts, type VettingGroup, type VettingReport } from '../../contracts/vetting';
import { RequestError } from '../bigquery/filters';
import { sourceAccess, type SourceAccess } from '../bigquery/sourceAccess';
import { getClientConfig } from '../bigquery/config';
import { compileVetting, vettingScope, type VettingInput } from './query';
const count = (v: unknown, nullable = false): string | null => {
  if (v === null && nullable) return null;
  if (typeof v !== 'string' || !/^\d+$/.test(v)) throw new RequestError('Vetting count or precision contract failed',502);
  return v;
};
const decimal = (v: unknown): string | null => {
  if (v === null) return null;
  if (typeof v !== 'string' || !/^\d+(\.\d+)?$/.test(v)) throw new RequestError('Vetting timing precision contract failed',502);
  return v;
};
function counts(raw: any): VettingCounts {
  if (!raw || typeof raw !== 'object') throw new RequestError('Vetting aggregate is missing',502);
  const values = Object.fromEntries(COUNT_KEYS.map(k=>[k,count(raw[k],k!=='leads')])) as Record<VettingMetric,string|null>;
  const result: VettingCounts = {...values,classMeanSeconds:decimal(raw.classMeanSeconds),colourMeanSeconds:decimal(raw.colourMeanSeconds)};
  for (const key of COUNT_KEYS) if(result[key]!==null && BigInt(result[key]!)>BigInt(result.leads!)) throw new RequestError(`Vetting subset exceeds its lead population (${key})`,502);
  return result;
}
/** Validate partition reconciliations on the actual returned aggregates, independently of chart state. */
export function validateVettingResult(raw: any) {
  if (!raw || !Array.isArray(raw.groups) || !Array.isArray(raw.diagnostics) || !Array.isArray(raw.timing)) throw new RequestError('Vetting query returned an incomplete result',502);
  if (raw.groups.length > 10000) throw new RequestError('Too many vetting groups; narrow the reporting window. Partial totals were not returned.',413);
  const current=counts(raw.current),previous=counts(raw.previous),seen=new Set<string>();
  const groups: VettingGroup[]=raw.groups.map((g:any)=>{
    if (!VETTING_SECTIONS.includes(g.section) || !['current','previous'].includes(g.period) || typeof g.key!=='string' || typeof g.series!=='string') throw new RequestError('Invalid vetting group',502);
    const id=JSON.stringify([g.section,g.period,g.key,g.series]);if(seen.has(id))throw new RequestError('Duplicated vetting group',502);seen.add(id);
    return {...counts(g),section:g.section,period:g.period,key:g.key,series:g.series};
  });
  for(const period of ['current','previous'] as const) for(const section of VETTING_SECTIONS.filter(s=>!s.startsWith('vendor'))){
    const rows=groups.filter(g=>g.period===period&&g.section===section),total=period==='current'?current:previous;
    for(const key of COUNT_KEYS){
      if(total[key]===null){if(rows.some(r=>r[key]!==null))throw new RequestError('Inconsistent vetting field availability',502);continue;}
      if(rows.some(r=>r[key]===null)||rows.reduce((n,r)=>n+BigInt(r[key]!),0n)!==BigInt(total[key]!))throw new RequestError(`Vetting ${section}/${period}/${key} does not reconcile to its summary`,502);
    }
  }
  if(raw.diagnostics.length!==2)throw new RequestError('Vetting diagnostics missing',502);
  const diagnostics = ['current','previous'].map(period=>{
    const matches=raw.diagnostics.filter((d:any)=>d?.period===period);
    if(matches.length!==1)throw new RequestError('Invalid or duplicate diagnostic period',502);
    return matches[0];
  });
  for(const d of diagnostics){
    for(const key of ['sourceRows','missingIdRows','conflictingLeads','conflictingRows','duplicateRowsCollapsed','eligibleUniqueLeads'])count(d[key]);
    if(BigInt(d.missingIdRows)+BigInt(d.conflictingRows)+BigInt(d.duplicateRowsCollapsed)+BigInt(d.eligibleUniqueLeads)!==BigInt(d.sourceRows))throw new RequestError('Vetting source exclusions do not reconcile',502);
    const total=d.period==='current'?current:previous;
    if(BigInt(total.leads!)>BigInt(d.eligibleUniqueLeads))throw new RequestError('Included leads exceed source eligibility',502);
  }
  const timing=raw.timing.map((r:any)=>{
    if(!['Class','Colour'].includes(r.kind))throw new RequestError('Invalid timing group',502);
    return {kind:r.kind,sample:count(r.sample)!,meanSeconds:decimal(r.meanSeconds),medianSeconds:decimal(r.medianSeconds),p90Seconds:decimal(r.p90Seconds)};
  });
  if(new Set(timing.map((t:any)=>t.kind)).size!==timing.length)throw new RequestError('Duplicate timing summary',502);
  for(const kind of ['Class','Colour']){
    const expected=current[kind==='Class'?'classTimed':'colourTimed'];const row=timing.find((r:any)=>r.kind===kind);
    if(expected!==null&&BigInt(row?.sample??'0')!==BigInt(expected))throw new RequestError('Timing sample does not reconcile',502);
  }
  return {current,previous,groups,diagnostics:diagnostics as VettingReport['diagnostics'],timing};
}
export async function getVettingReport(input: VettingInput, access?: SourceAccess): Promise<VettingReport> {
  const scope=vettingScope(input),client=getClientConfig(scope.clientId);
  if(client.dataSourceMode!=='separate')throw new RequestError('Unverified tenant isolation',503);
  const warehouse=access||sourceAccess(client.id),table=client.semanticMappings.tables.leads;
  const compiled=compileVetting(input,await warehouse.metadata(table));
  const execution=await warehouse.execute({query:compiled.query,params:compiled.params});
  if(execution.rows.length!==1)throw new RequestError('Expected one complete vetting response',502);
  const raw=execution.rows[0],result=validateVettingResult(raw);
  if(typeof raw.generatedAt!=='string'||!Number.isFinite(Date.parse(raw.generatedAt)))throw new RequestError('Query observation time missing',502);
  return {...result,fields:compiled.fields,scope:{...scope,clientId:client.id,filters:scope.filters||{}},evidence:{version:VETTING_VERSION,table,jobId:execution.jobId,referencedTables:execution.referencedTables,bytesProcessed:execution.bytesProcessed,
    generatedAt:raw.generatedAt,snapshotPinned:false,validationStatus:'SOURCE_QUERY_NOT_INDEPENDENTLY_RECONCILED'},notes:[
    'Class and colour are separate recorded classifications. A–F/U codes and colour names do not imply approval, creditworthiness, a sale or billability.',
    'Colour uses a recognised first comma-delimited colour token only. Non-colour outcomes, missing values and multiple named colours remain separate. Raw result strings are retained.',
    'One included row is one lead ID with an unambiguous reporting projection in the inspected capture windows. Identical reporting projections collapse; conflicting projections and missing IDs are excluded, not assigned an arbitrary latest value.',
    'Outcome counts use only selected HLC records already attached to each lead: valid delivery, first-dial, sale and activation timestamps, and a positive recorded RPC flag. Separate dialler/activation tables are not joined without verified identifiers. Missing evidence does not prove failure.',
    'Class/colour and outcomes are current source observations for capture cohorts, not historical grading events or transition histories. UTC parsing of timezone-free strings follows the existing source contract and is not independently verified.',
    'The preceding comparison window has the same calendar length and the same filters. Outcome follow-up differs between cohorts; changes are descriptive, not causal. Current field assignments can post-date an outcome.',
    'Source and class/colour groups partition the included leads. Vendor groups may overlap because one lead can have several vendors. Vendor outcomes are restricted to that vendor’s HLC records.',
    'Quality diagnostics describe the inspected capture windows before classification and vendor filters. Missing/invalid capture timestamps cannot be assigned to a period and are outside this date-bound report.',
    'All charts, tables and exports use this single API response. This is not an approved pinned data release; reloading can change source observations. No commercial values or rates are inferred.',
  ]};
}
