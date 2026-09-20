const schema = require('../includes/schema');
assert('field_reconciliation').query(ctx => Object.entries(schema.fields).map(([kind,fields]) => `SELECT COALESCE(x.entity_key,y.entity_key) AS entity_key
  FROM ${ctx.ref('records')} x FULL OUTER JOIN ${ctx.ref('fact_'+kind)} y ON x.tenant_id=y.tenant_id AND x.entity_key=y.entity_key AND x.entity_kind='${kind}'
  WHERE (x.entity_kind='${kind}' OR x.entity_key IS NULL) AND (x.entity_key IS NULL OR y.entity_key IS NULL OR ${Object.entries(fields).map(([k,t])=>`${t==='STRING'?`JSON_VALUE(x.payload,'$.${k}')`:`SAFE_CAST(JSON_VALUE(x.payload,'$.${k}') AS ${t})`} IS DISTINCT FROM y.${k}`).join(' OR ')})`).join(' UNION ALL '));
