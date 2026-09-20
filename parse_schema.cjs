const fs = require('fs');
const schema = JSON.parse(fs.readFileSync('schema_dump.json', 'utf8'));

const tables = ["clustered_lead_ledger", "lead_ledger_all_vicidial_insights", "lead_ledger_all_vicidial_insights_time_to_dial", "tbl_blc_activations", "lead_ledger_platform_insights"];

for (const t of tables) {
  console.log(`\n--- TABLE: ${t} ---`);
  schema.filter(r => r.table_name === t).forEach(r => {
    console.log(`${r.column_name}: ${r.data_type}`);
  });
}
