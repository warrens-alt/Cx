import { tableIdentifier,type TenantConfiguration } from './config';
/** A missing optional source must never borrow another tenant's default table. */
export function configuredRelation(client:TenantConfiguration,role:'calls'|'activations'){
  const table=client.semanticMappings.tables[role];
  if(table){const [project,dataset]=table.split('.');if(project!==client.bigQueryProject||!client.bigQueryDatasets.includes(dataset))throw new Error('Configured relation is outside the tenant source datasets');return tableIdentifier(table);}
  const columns=role==='calls'?{dialer_lead_id:'STRING',vendor:'STRING',call_start_date:'STRING',call_end_date:'STRING',length_in_sec:'INT64',is_rpc:'BOOL',is_sale:'BOOL'}:
    {transaction_id:'STRING',date_created:'STRING',expected_ontact_revenue:'NUMERIC'};
  return `(SELECT ${Object.entries(columns).map(([name,type])=>`CAST(NULL AS ${type}) AS ${name}`).join(', ')} WHERE FALSE)`;
}
