import type { TenantConfiguration } from './config';
import { sourceCatalogue } from './sourceCatalog';
/** Discovery reflects actual configured identities and live metadata, not filename guesses. */
export async function discoverData(client:TenantConfiguration){
  const catalogue=await sourceCatalogue(client.id);
  return [...catalogue.sources.map(s=>({dataset:s.table?.split('.')[1]??null,table:s.table?.split('.')[2]??null,tableId:s.table,
    type:'type' in s?s.type:null,domain:s.label,rows:s.rowCount,latestRecord:null,mapped:!!s.table,
    usedBy:s.legacyConsumers.join(', '),status:s.status,reason:s.reason??null,inventoryComplete:catalogue.inventoryComplete})),
    ...catalogue.unmappedTables.map(s=>({dataset:s.table.split('.')[1],table:s.table.split('.')[2],tableId:s.table,type:null,domain:'Unmapped',rows:null,
      latestRecord:null,mapped:false,usedBy:'',status:s.status,reason:s.reason,inventoryComplete:catalogue.inventoryComplete}))];
}
