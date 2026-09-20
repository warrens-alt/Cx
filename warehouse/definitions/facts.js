const schema = require('../includes/schema');
for (const [kind, columns] of Object.entries(schema.fields)) {
  publish('fact_' + kind, {
    type: 'table', tags: ['candidate', 'fact'], dependOnDependencyAssertions: false,
    assertions: {
      uniqueKeys: [['tenant_id', 'entity_key']],
      nonNull: ['tenant_id', 'entity_key', 'source_record_id', 'source_id', 'batch_id', 'recorded_at', ...Object.keys(columns).filter(k => !schema.optional[kind].includes(k))],
      rowConditions: kind === 'commercial' ? ["REGEXP_CONTAINS(currency,r'^[A-Z]{3}$')", "stage IN ('expected','approved','invoiced','collected')"] : [],
    },
  }).query(ctx => `SELECT tenant_id,entity_key,source_record_id,source_id,batch_id,revision,payload_hash,recorded_at,
    ${Object.entries(columns).map(([name, type]) => `${type === 'STRING' ? `JSON_VALUE(payload,'$.${name}')` : `SAFE_CAST(JSON_VALUE(payload,'$.${name}') AS ${type})`} AS ${name}`).join(',\n')}
    FROM ${ctx.ref('records')} WHERE entity_kind='${kind}'`);
}
