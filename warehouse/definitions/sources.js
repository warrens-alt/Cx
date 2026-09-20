const vars = dataform.projectConfig.vars;
if (!/^[A-Za-z0-9_]+$/.test(vars.sourceDataset) || !/^[A-Za-z0-9_-]+$/.test(vars.tenantId)) throw new Error('Invalid source configuration');
if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(vars.cutoff)) throw new Error('An explicit UTC build cutoff is required');
for (const name of ['raw_records', 'ingestion_batches', 'source_contracts']) declare({ database: dataform.projectConfig.defaultDatabase, schema: vars.sourceDataset, name });
