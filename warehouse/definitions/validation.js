const v = dataform.projectConfig.vars;
const scoped = alias => `${alias}.tenant_id='${v.tenantId}' AND ${alias}.recorded_at<=TIMESTAMP('${v.cutoff}')`;
assert('revision_conflicts').query(ctx => `SELECT tenant_id,entity_kind,entity_key,revision FROM ${ctx.ref('raw_scope')} r WHERE ${scoped('r')}
  GROUP BY 1,2,3,4 HAVING COUNT(DISTINCT payload_hash)>1 OR COUNT(DISTINCT source_id)>1`);
assert('batch_accounting').query(ctx => `
  SELECT b.batch_id FROM ${ctx.ref('batch_scope')} b LEFT JOIN ${ctx.ref('raw_scope')} r USING(tenant_id,batch_id)
  WHERE b.tenant_id='${v.tenantId}' AND b.completed_at<=TIMESTAMP('${v.cutoff}')
  GROUP BY b.batch_id,b.status,b.expected_count,b.accepted_count
  HAVING b.status!='COMPLETE' OR b.expected_count!=COUNT(r.entity_key) OR b.accepted_count!=COUNT(r.entity_key)
  UNION ALL SELECT r.batch_id FROM ${ctx.ref('raw_scope')} r LEFT JOIN ${ctx.ref('batch_scope')} b USING(tenant_id,batch_id)
  LEFT JOIN ${ctx.ref('contract_scope')} c ON r.tenant_id=c.tenant_id AND r.source_id=c.source_id AND r.entity_kind=c.entity_kind AND r.contract_version=c.contract_version
  WHERE ${scoped('r')} AND (b.batch_id IS NULL OR b.status!='COMPLETE' OR c.status IS NULL OR c.status!='APPROVED')
  UNION ALL SELECT source_id FROM ${ctx.ref('contract_scope')} WHERE tenant_id='${v.tenantId}' GROUP BY source_id,entity_kind,contract_version HAVING COUNT(*)>1
  UNION ALL SELECT batch_id FROM ${ctx.ref('batch_scope')} WHERE tenant_id='${v.tenantId}' GROUP BY batch_id HAVING COUNT(*)>1`);
const kinds = ['leads','deliveries','calls','sales','activations','commercial'];
assert('fact_uniqueness').query(ctx => kinds.map(kind => `SELECT '${kind}' AS fact,entity_key FROM ${ctx.ref('fact_'+kind)} GROUP BY tenant_id,entity_key HAVING COUNT(*)>1 OR entity_key IS NULL OR tenant_id IS NULL`).join(' UNION ALL '));
assert('relationships').query(ctx => [
  ['deliveries','leads','lead_key'],['calls','deliveries','delivery_key'],['sales','deliveries','delivery_key'],['activations','sales','sale_key'],['commercial','sales','sale_key'],
].map(([child,parent,key]) => `SELECT '${child}' AS fact,c.entity_key FROM ${ctx.ref('fact_'+child)} c LEFT JOIN ${ctx.ref('fact_'+parent)} p ON c.tenant_id=p.tenant_id AND c.${key}=p.entity_key WHERE p.entity_key IS NULL`).join(' UNION ALL '));
assert('chronology').query(ctx => `SELECT 'leads' AS fact,entity_key FROM ${ctx.ref('fact_leads')} WHERE captured_at IS NULL OR captured_at>TIMESTAMP('${v.cutoff}')
  UNION ALL SELECT 'deliveries',d.entity_key FROM ${ctx.ref('fact_deliveries')} d JOIN ${ctx.ref('fact_leads')} l ON l.entity_key=d.lead_key AND l.tenant_id=d.tenant_id
    WHERE d.attempted_at IS NULL OR d.attempted_at<l.captured_at OR d.delivered_at<d.attempted_at
  UNION ALL SELECT 'calls',c.entity_key FROM ${ctx.ref('fact_calls')} c JOIN ${ctx.ref('fact_deliveries')} d ON c.delivery_key=d.entity_key AND c.tenant_id=d.tenant_id
    WHERE c.event_at IS NULL OR c.event_at<d.attempted_at
  UNION ALL SELECT 'sales',s.entity_key FROM ${ctx.ref('fact_sales')} s JOIN ${ctx.ref('fact_deliveries')} d ON s.delivery_key=d.entity_key AND s.tenant_id=d.tenant_id
    WHERE s.event_at IS NULL OR s.event_at<d.attempted_at
  UNION ALL SELECT 'activations',a.entity_key FROM ${ctx.ref('fact_activations')} a JOIN ${ctx.ref('fact_sales')} s ON a.sale_key=s.entity_key AND a.tenant_id=s.tenant_id
    WHERE a.event_at IS NULL OR a.event_at<s.event_at
  UNION ALL SELECT 'commercial',f.entity_key FROM ${ctx.ref('fact_commercial')} f JOIN ${ctx.ref('fact_sales')} s ON f.sale_key=s.entity_key AND f.tenant_id=s.tenant_id
    WHERE f.event_at IS NULL OR f.event_at<s.event_at`);
assert('amounts').query(ctx => `SELECT entity_key FROM ${ctx.ref('fact_commercial')} WHERE amount_delta IS NULL OR currency IS NULL OR NOT REGEXP_CONTAINS(currency,r'^[A-Z]{3}$')
  OR stage NOT IN ('expected','approved','invoiced','collected') OR stage IS NULL OR NULLIF(agreement_version,'') IS NULL`);
assert('raw_fact_counts').query(ctx => kinds.map(kind => `SELECT '${kind}' AS fact FROM (SELECT COUNT(DISTINCT entity_key) AS n FROM ${ctx.ref('raw_scope')} r
  WHERE ${scoped('r')} AND entity_kind='${kind}') a CROSS JOIN (SELECT COUNT(*) AS n FROM ${ctx.ref('fact_'+kind)}) b WHERE a.n!=b.n`).join(' UNION ALL '));
// Explicit publication dependency: a successful table build is not a successful validation run.
operate('ready_to_snapshot', { dependencies: ['revision_conflicts','batch_accounting','fact_uniqueness','relationships','chronology','amounts','raw_fact_counts','field_reconciliation'], dependOnDependencyAssertions: true, tags: ['release_gate'] })
  .queries('SELECT "Assertions passed; a separate publisher must create and verify immutable snapshots." AS release_gate');
