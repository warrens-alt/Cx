const fs = require('fs');

let viewsTs = fs.readFileSync('server/bigquery/views.ts', 'utf8');

// Add WITH OFFSET
viewsTs = viewsTs.replace(/LEFT JOIN UNNEST\(l\.hlc_details\) as hlc/g, 'LEFT JOIN UNNEST(l.hlc_details) as hlc WITH OFFSET as idx');
viewsTs = viewsTs.replace(/l\.\* EXCEPT\(hlc_details\),/, 'l.* EXCEPT(hlc_details),\n        idx + 1 as hlc_record_number,');

// Add hlc_record_number to vw_lead_vendor_transactions
viewsTs = viewsTs.replace(/t\.hlc_vendor as vendor,/, 't.hlc_record_number,\n        t.hlc_vendor as vendor,');

// Modify vw_leads to generate dynamic columns
const MAX_FLATTENED_HLC = 10; // "Configurable safe maximum"

let flattenedColumns = '';
for (let i = 1; i <= MAX_FLATTENED_HLC; i++) {
  flattenedColumns += `
        MAX(CASE WHEN hlc_record_number = ${i} THEN vendor END) as hlc_${i}_vendor,
        MAX(CASE WHEN hlc_record_number = ${i} THEN transaction_id END) as hlc_${i}_transaction_id,
        MAX(CASE WHEN hlc_record_number = ${i} THEN latest_dialer_status END) as hlc_${i}_status,
        MAX(CASE WHEN hlc_record_number = ${i} THEN attempted_delivery_timestamp END) as hlc_${i}_attempted_to_deliver,
        MAX(CASE WHEN hlc_record_number = ${i} THEN delivery_timestamp END) as hlc_${i}_delivered,
        MAX(CASE WHEN hlc_record_number = ${i} THEN first_call_timestamp END) as hlc_${i}_first_call_date,
        MAX(CASE WHEN hlc_record_number = ${i} THEN last_call_timestamp END) as hlc_${i}_last_call_date,
        MAX(CASE WHEN hlc_record_number = ${i} THEN latest_dialer_status END) as hlc_${i}_last_dialer_status,
        MAX(CASE WHEN hlc_record_number = ${i} THEN total_call_duration_seconds END) as hlc_${i}_total_calls_length_in_sec,
        MAX(CASE WHEN hlc_record_number = ${i} THEN total_calls END) as hlc_${i}_total_calls,
        MAX(CASE WHEN hlc_record_number = ${i} THEN rpc END) as hlc_${i}_rpc,
        MAX(CASE WHEN hlc_record_number = ${i} THEN sale END) as hlc_${i}_sale,
        MAX(CASE WHEN hlc_record_number = ${i} THEN activation END) as hlc_${i}_activated,
        MAX(CASE WHEN hlc_record_number = ${i} THEN revenue END) as hlc_${i}_revenue_generated,
        MAX(CASE WHEN hlc_record_number = ${i} THEN currency END) as hlc_${i}_currency,`;
}

// Ensure the commas don't break the query. Add it before `false as duplicate_flag`
viewsTs = viewsTs.replace(/SUM\(revenue\) as total_revenue,/, `SUM(revenue) as total_revenue,${flattenedColumns}`);

fs.writeFileSync('server/bigquery/views.ts', viewsTs);

// Now update export.ts
let exportTs = fs.readFileSync('server/bigquery/export.ts', 'utf8');

// For grain 'lead', we need to select all columns (using SELECT *) since the columns are already beautifully flattened in vw_leads.
// Wait, the current export.ts explicitly lists columns: lead_id as \`Lead ID\`...
// We can change it to SELECT * FROM vw_leads
// But `vw_leads` has internal columns like `client_id` that we don't need.
// We can do SELECT * EXCEPT(client_id, duplicate_flag, ...)
exportTs = exportTs.replace(/SELECT\s+lead_id as \`Lead ID\`,[\s\S]*?FROM vw_leads/g, `SELECT * EXCEPT(client_id, duplicate_flag) FROM vw_leads`);

fs.writeFileSync('server/bigquery/export.ts', exportTs);
