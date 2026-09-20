import type { ReleaseManifest } from '../../contracts/reporting';
import { FACTS } from '../../contracts/reporting';
import { REQUIRED_CHECKS } from './release';
import { tableIdentifier } from '../bigquery/config';
/** Independent release checks query the frozen raw observations as well as the frozen facts. */
export function releaseCheckQueries(r: ReleaseManifest): Record<string, string> {
  const ref = (f: typeof FACTS[number]) => tableIdentifier(r.snapshots[f].table);
  const raw = tableIdentifier(r.provenance.records.table), batches = tableIdentifier(r.provenance.batches.table), contracts = tableIdentifier(r.provenance.contracts.table);
  const required: Record<string,string[]> = {
    leads: ['captured_at','source'], deliveries: ['lead_key','vendor','attempted_at'], calls: ['delivery_key','event_at'],
    sales: ['delivery_key','event_at'], activations: ['sale_key','event_at'], commercial: ['sale_key','event_at','stage','amount_delta','currency','agreement_version'],
  };
  const comparable = { ...required, leads: [...required.leads, 'medium'], deliveries: [...required.deliveries, 'delivered_at'] };
  const sql: Record<string, string> = {
    revision_conflicts: `SELECT COUNT(*) AS failures FROM (SELECT tenant_id,entity_kind,entity_key,revision FROM ${raw} GROUP BY 1,2,3,4 HAVING COUNT(DISTINCT payload_hash)>1 OR COUNT(DISTINCT source_id)>1)`,
    batch_accounting: `SELECT COUNT(*) AS failures FROM (
      SELECT b.batch_id FROM ${batches} b LEFT JOIN ${raw} r USING(tenant_id,batch_id) GROUP BY b.batch_id,b.status,b.expected_count,b.accepted_count
      HAVING b.status IS NULL OR b.status!='COMPLETE' OR b.expected_count IS NULL OR b.accepted_count IS NULL OR b.expected_count<0 OR b.expected_count!=COUNT(r.entity_key) OR b.accepted_count!=COUNT(r.entity_key)
      UNION ALL SELECT r.batch_id FROM ${raw} r LEFT JOIN ${batches} b USING(tenant_id,batch_id)
      LEFT JOIN ${contracts} c ON r.tenant_id=c.tenant_id AND r.source_id=c.source_id AND r.entity_kind=c.entity_kind AND r.contract_version=c.contract_version
      WHERE b.batch_id IS NULL OR b.status!='COMPLETE' OR c.status IS NULL OR c.status!='APPROVED' OR NULLIF(c.owner,'') IS NULL OR NULLIF(c.approval_reference,'') IS NULL
      UNION ALL SELECT batch_id FROM ${batches} WHERE tenant_id!=@tenant OR tenant_id IS NULL OR completed_at IS NULL OR completed_at>TIMESTAMP(@cutoff)
      UNION ALL SELECT batch_id FROM ${batches} GROUP BY batch_id HAVING COUNT(*)>1
      UNION ALL SELECT source_id FROM ${contracts} GROUP BY tenant_id,source_id,entity_kind,contract_version HAVING COUNT(*)>1)`,
    fact_uniqueness: `SELECT COUNT(*) AS failures FROM (${FACTS.map(f => `SELECT entity_key FROM ${ref(f)} GROUP BY tenant_id,entity_key HAVING COUNT(*)>1
      UNION ALL SELECT entity_key FROM ${ref(f)} WHERE tenant_id!=@tenant OR tenant_id IS NULL OR entity_key IS NULL OR source_record_id IS NULL OR batch_id IS NULL OR recorded_at IS NULL OR recorded_at>TIMESTAMP(@cutoff) OR ${required[f].map(k=>`${k} IS NULL`).join(' OR ')}`).join(' UNION ALL ')}
      UNION ALL SELECT entity_key FROM ${raw} WHERE tenant_id!=@tenant OR tenant_id IS NULL OR entity_key IS NULL OR source_record_id IS NULL OR recorded_at IS NULL OR recorded_at>TIMESTAMP(@cutoff) OR batch_id IS NULL OR entity_kind IS NULL OR revision IS NULL OR revision<0 OR entity_kind NOT IN ('leads','deliveries','calls','sales','activations','commercial') OR source_id IS NULL OR payload_hash IS NULL OR (entity_kind IN ('calls','commercial') AND revision!=0))`,
    relationships: `SELECT COUNT(*) AS failures FROM (${[['deliveries','leads','lead_key'],['calls','deliveries','delivery_key'],['sales','deliveries','delivery_key'],['activations','sales','sale_key'],['commercial','sales','sale_key']].map(([c,p,k])=>`SELECT c.entity_key FROM ${ref(c as any)} c LEFT JOIN ${ref(p as any)} p ON c.tenant_id=p.tenant_id AND c.${k}=p.entity_key WHERE p.entity_key IS NULL`).join(' UNION ALL ')})`,
    chronology: `SELECT COUNT(*) AS failures FROM (
      SELECT entity_key FROM ${ref('leads')} WHERE captured_at IS NULL OR captured_at>TIMESTAMP(@cutoff) OR captured_at>recorded_at
      UNION ALL SELECT d.entity_key FROM ${ref('deliveries')} d JOIN ${ref('leads')} l ON l.entity_key=d.lead_key AND l.tenant_id=d.tenant_id WHERE d.attempted_at<l.captured_at OR d.delivered_at<d.attempted_at OR d.delivered_at>d.recorded_at OR d.attempted_at>d.recorded_at
      ${(['calls','sales'] as const).map(f=>`UNION ALL SELECT c.entity_key FROM ${ref(f)} c JOIN ${ref('deliveries')} d ON c.delivery_key=d.entity_key AND c.tenant_id=d.tenant_id WHERE c.event_at<d.attempted_at OR c.event_at>c.recorded_at`).join('\n')}
      ${(['activations','commercial'] as const).map(f=>`UNION ALL SELECT c.entity_key FROM ${ref(f)} c JOIN ${ref('sales')} s ON c.sale_key=s.entity_key AND c.tenant_id=s.tenant_id WHERE c.event_at<s.event_at OR c.event_at>c.recorded_at`).join('\n')})`,
    amounts: `SELECT COUNT(*) AS failures FROM (
      SELECT entity_key FROM ${ref('commercial')} WHERE amount_delta IS NULL OR currency IS NULL OR NOT REGEXP_CONTAINS(currency,r'^[A-Z]{3}$') OR stage IS NULL OR stage NOT IN ('expected','approved','invoiced','collected') OR NULLIF(agreement_version,'') IS NULL
      UNION ALL SELECT entity_key FROM ${raw} WHERE entity_kind='commercial' AND NOT REGEXP_CONTAINS(IFNULL(JSON_VALUE(payload,'$.amount_delta'),''),r'^-?[0-9]{1,29}(\\.[0-9]{1,9})?$'))`,
    field_reconciliation: `SELECT COUNT(*) AS failures FROM (${FACTS.map(f=>`SELECT COALESCE(x.entity_key,y.entity_key) AS entity_key FROM (SELECT * FROM ${raw} WHERE entity_kind='${f}' QUALIFY ROW_NUMBER() OVER(PARTITION BY tenant_id,entity_key ORDER BY revision DESC,recorded_at DESC,payload_hash)=1) x FULL OUTER JOIN ${ref(f)} y ON x.tenant_id=y.tenant_id AND x.entity_key=y.entity_key WHERE x.entity_key IS NULL OR y.entity_key IS NULL OR ${comparable[f].map(k=>`JSON_VALUE(x.payload,'$.${k}') IS DISTINCT FROM CAST(y.${k} AS STRING)`).map(expr=>expr.replace(/JSON_VALUE\(x.payload,'\$\.([a-z_]+_at)'\) IS DISTINCT FROM CAST\(y.([a-z_]+_at) AS STRING\)/g,"SAFE_CAST(JSON_VALUE(x.payload,'$.$1') AS TIMESTAMP) IS DISTINCT FROM y.$2").replace("JSON_VALUE(x.payload,'$.amount_delta') IS DISTINCT FROM CAST(y.amount_delta AS STRING)","SAFE_CAST(JSON_VALUE(x.payload,'$.amount_delta') AS NUMERIC) IS DISTINCT FROM y.amount_delta")).join(' OR ')}`).join(' UNION ALL ')})`,
    raw_fact_counts: `SELECT COUNT(*) AS failures FROM (${FACTS.map(f=>`SELECT '${f}' AS fact FROM (SELECT COUNT(DISTINCT entity_key) AS n FROM ${raw} WHERE entity_kind='${f}') x CROSS JOIN (SELECT COUNT(*) AS n FROM ${ref(f)}) y WHERE x.n!=y.n`).join(' UNION ALL ')})`,
  };
  if (REQUIRED_CHECKS.some(id=>!sql[id])) throw new Error('Release check definitions are incomplete');
  return sql;
}
