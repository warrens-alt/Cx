const v = dataform.projectConfig.vars;
publish('raw_scope', {type:'table'}).query(ctx => `SELECT * FROM ${ctx.ref('raw_records')} WHERE tenant_id='${v.tenantId}' AND recorded_at<=TIMESTAMP('${v.cutoff}')`);
publish('batch_scope', {type:'table'}).query(ctx => `SELECT * FROM ${ctx.ref('ingestion_batches')} WHERE tenant_id='${v.tenantId}' AND completed_at<=TIMESTAMP('${v.cutoff}')`);
publish('contract_scope', {type:'table'}).query(ctx => `SELECT * FROM ${ctx.ref('source_contracts')} WHERE tenant_id='${v.tenantId}'`);
