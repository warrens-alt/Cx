import { BigQuery, type Query } from '@google-cloud/bigquery';
import { RequestError } from './filters';
import { getClientConfig, tableIdentifier, type TenantConfiguration } from './config';
export interface SchemaField {name:string;type:string;mode?:string;fields?:SchemaField[];}
export interface TableMetadata {type?:string;numRows?:string;creationTime?:string;lastModifiedTime?:string;schema?:{fields?:SchemaField[]};}
export interface SourceAccess {
  metadata(table:string):Promise<TableMetadata>;
  listTables(project:string,dataset:string):Promise<string[]>;
  execute(options:Query):Promise<{rows:Record<string,any>[];jobId:string|null;referencedTables:string[];bytesProcessed:string|null;}>;
}
/** Separate from ambient legacy filter bindings. Only server-configured datasets may be read. */
export class BigQuerySourceAccess implements SourceAccess {
  private bq:BigQuery;
  constructor(private readonly client:TenantConfiguration) {
    this.bq=new BigQuery({projectId:client.bigQueryProject,credentials:process.env.BIGQUERY_CREDENTIALS?JSON.parse(process.env.BIGQUERY_CREDENTIALS):undefined});
  }
  private allowed(table:string){
    tableIdentifier(table);const [project,dataset]=table.split('.');
    if(project!==this.client.bigQueryProject||!this.client.bigQueryDatasets.includes(dataset))throw new RequestError('Source is outside the authorised tenant datasets',403);
  }
  async metadata(table:string){this.allowed(table);const [project,dataset,id]=table.split('.');const [m]=await this.bq.dataset(dataset,{projectId:project}).table(id).getMetadata();return m as TableMetadata;}
  async listTables(project:string,dataset:string){
    this.allowed(`${project}.${dataset}._scope_check`);
    const [tables]=await this.bq.dataset(dataset,{projectId:project}).getTables({autoPaginate:true});
    return tables.map(t=>`${project}.${dataset}.${t.id}`);
  }
  async execute(options:Query){
    const budget=process.env.BIGQUERY_MAX_BYTES_BILLED||'1000000000';
    if(!/^\d+$/.test(budget)||BigInt(budget)<=0n)throw new RequestError('Invalid query budget',503);
    const [job]=await this.bq.createQueryJob({...options,useLegacySql:false,maximumBytesBilled:budget,jobTimeoutMs:60000});
    const [rows]=await job.getQueryResults();
    const [m]=await job.getMetadata();
    return {rows,jobId:job.id||null,referencedTables:(m.statistics?.query?.referencedTables||[]).map((t:any)=>`${t.projectId}.${t.datasetId}.${t.tableId}`),bytesProcessed:m.statistics?.query?.totalBytesProcessed??null};
  }
}
export const sourceAccess=(tenant:string)=>new BigQuerySourceAccess(getClientConfig(tenant));
export function flatSchema(fields:SchemaField[],prefix='',repeated=false):Map<string,{type:string;repeated:boolean}>{
  const result=new Map<string,{type:string;repeated:boolean}>();
  for(const f of fields){const name=prefix?`${prefix}.${f.name}`:f.name,isRepeated=repeated||f.mode==='REPEATED';result.set(name,{type:f.type.toUpperCase(),repeated:isRepeated});
    for(const [key,value]of flatSchema(f.fields||[],name,isRepeated))result.set(key,value);
  }return result;
}
export function safeSourceError(error:unknown){
  const code=Number((error as any)?.code||(error as any)?.status);
  return code===403?{status:'ACCESS_DENIED',reason:'The application identity cannot read this source.'}:code===404?{status:'MISSING',reason:'The configured source was not found.'}:{status:'CHECK_FAILED',reason:'The warehouse check failed; absence of evidence is not an empty source.'};
}
