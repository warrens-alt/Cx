import { CANONICAL_PARAMETERS } from './registry';
import { SOURCE_ROLES } from '../../contracts/sourceCoverage';
import { getClientConfig } from './config';
import { sourceCatalogue } from './sourceCatalog';
import { sourceAccess,type SourceAccess } from './sourceAccess';
/** Historical mapping expressions are proposals until their fields have been inspected; never population proof. */
export async function parameterCoverage(clientId:string,access:SourceAccess=sourceAccess(clientId)){
  const catalogue=await sourceCatalogue(clientId,access),config=getClientConfig(clientId);
  const parameters=CANONICAL_PARAMETERS.map(p=>{
    const role=SOURCE_ROLES.find(k=>config.semanticMappings.tables[k]?.split('.').pop()===p.sourceTable);
    const source=catalogue.sources.find(s=>s.role===role);
    const match=p.sourceColumn.match(/^(?:MIN|MAX|SUM|LOGICAL_OR)\(([A-Za-z_][\w.]*)\)$/);
    const column=match?match[1]:p.sourceColumn;
    const field=source?.schema.find((f:any)=>f.path===column);
    const checked=!!source&&['SCHEMA_PRESENT','SCHEMA_GAP'].includes(source.status);
    const status=!checked?'NOT_CHECKED':column==='COUNT(*)'?'TABLE_PRESENT':field?'FIELD_PRESENT':'FIELD_MISSING';
    return {...p,sourceTable:source?.table??p.sourceTable,proposedType:p.dataType,dataType:field?.type??null,status,populated:null,
      interpretation:'Field presence only. This registry is not independent confirmation of query precedence, join accuracy or completeness.'};
  });
  const mapped=parameters.filter(p=>['FIELD_PRESENT','TABLE_PRESENT'].includes(p.status)).length;
  return {summary:{totalRequired:parameters.length,mapped,populated:null,unavailable:parameters.filter(p=>p.status==='FIELD_MISSING').length,
    notChecked:parameters.filter(p=>p.status==='NOT_CHECKED').length,sourceConflicts:null,coveragePercent:parameters.length?100*mapped/parameters.length:null,
    populationStatus:'NOT_MEASURED',inventoryComplete:catalogue.inventoryComplete},parameters,checkedAt:catalogue.checkedAt};
}
