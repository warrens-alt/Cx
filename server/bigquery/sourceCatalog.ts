import { SOURCE_ROLES,SOURCE_DEFINITIONS,SOURCE_COVERAGE_VERSION,type SourceRole } from '../../contracts/sourceCoverage';
import { METRICS as V2_METRICS } from '../../contracts/reporting';
import { getBaseSemanticLayer } from './views';
import { getClientConfig,tableIdentifier } from './config';
import { flatSchema,safeSourceError,sourceAccess,type SourceAccess } from './sourceAccess';
export function sourceTable(clientId:string,role:SourceRole){
  const c=getClientConfig(clientId),table=c.semanticMappings.tables[role];
  if(table){tableIdentifier(table);const [p,d]=table.split('.');if(p!==c.bigQueryProject||!c.bigQueryDatasets.includes(d))throw new Error('Configured source is outside tenant datasets');}return table??null;
}
export function metricTableLineage(clientId:string,release?:any){
  const client=getClientConfig(clientId),sql=getBaseSemanticLayer(client);
  const legacyTables=SOURCE_ROLES.map(role=>({role,table:sourceTable(clientId,role)})).filter(s=>s.table&&sql.includes('`'+s.table+'`'));
  return {version:SOURCE_COVERAGE_VERSION,legacy:{tables:legacyTables,validationStatus:'NOT_VERIFIED',note:'These are physical dependencies of the legacy semantic query, not proof of complete or correctly matched data.'},
    versioned:V2_METRICS.map(m=>({metricId:m.id,label:m.label,requiredFacts:m.requires,api:'/api/reporting/reports',status:release?'PINNED_RELEASE':'RELEASE_REQUIRED',tables:m.requires.map(f=>({fact:f,table:release?.snapshots?.[f]?.table??null})),note:'Vendor-filtered lead reports additionally require delivery facts. Raw HLC counters cannot substitute for immutable call events or financial ledger deltas.'}))};
}
export async function sourceCatalogue(clientId:string,access:SourceAccess=sourceAccess(clientId)){
  const c=getClientConfig(clientId),checkedAt=new Date().toISOString();
  const inventory=await Promise.all(c.bigQueryDatasets.map(async dataset=>{try{return {dataset,tables:await access.listTables(c.bigQueryProject,dataset),status:'LISTED'};}catch(e){return {dataset,tables:[] as string[],...safeSourceError(e)};}}));
  const allTables=[...new Set(inventory.flatMap(i=>i.tables))];
  const sources=await Promise.all(SOURCE_ROLES.map(async role=>{
    const definition=SOURCE_DEFINITIONS[role],table=sourceTable(clientId,role);
    const base={role,table,label:definition.label,api:`/api/analytics/source-metrics/${role}`,dateField:definition.dateField,dateMeaning:definition.dateMeaning,legacyConsumers:definition.legacyConsumers,warning:definition.warning};
    if(!table)return {...base,status:'NOT_CONFIGURED',schema:[],metrics:[],rowCount:null,populated:null,reason:'No source table configured for this role.'};
    try{const metadata=await access.metadata(table),fields=flatSchema(metadata.schema?.fields||[]),required=[definition.dateField,...definition.requiredIdentityFields],missing=required.filter(f=>!fields.has(f));
      return {...base,status:missing.length?'SCHEMA_GAP':'SCHEMA_PRESENT',reason:missing.length?`Missing required fields: ${missing.join(', ')}`:null,type:metadata.type??null,
        rowCount:metadata.numRows??null,populated:null,rowCountBasis:'WAREHOUSE_METADATA_NOT_PERIOD_COUNT',missingFields:missing,
        schema:[...fields].map(([path,value])=>({path,...value})),metrics:definition.metrics.map(m=>({...m,status:!m.field||fields.has(m.field)?'MAPPED_NOT_MEASURED':'FIELD_MISSING'})),
        note:'Schema presence is not evidence of data completeness or source-business correctness.'};
    }catch(e){return {...base,...safeSourceError(e),schema:[],metrics:[],rowCount:null,populated:null};}
  }));
  const mapped=new Set(sources.map(s=>s.table).filter(Boolean));
  return {version:SOURCE_COVERAGE_VERSION,clientId,checkedAt,validationStatus:'NOT_VERIFIED',inventoryComplete:inventory.every(i=>i.status==='LISTED'),inventory,
    sources,unmappedTables:allTables.filter(t=>!mapped.has(t)).map(table=>({table,status:'UNMAPPED',reason:'No approved metric or identity mapping. Not automatically joined to analytical populations.'})),
    metricLineage:metricTableLineage(clientId)};
}
