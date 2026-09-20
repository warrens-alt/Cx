const fs = require('fs');

const code = `
export async function getSourcesStats(params: QueryParams) {
  const { projectId, datasetId, tableId, startDate, endDate, source, medium } = params;
  const bq = getBaseClient(projectId);
  
  let whereClauses = [];
  if (startDate) whereClauses.push(\`DATE(capture_timestamp) >= '\${startDate}'\`);
  if (endDate) whereClauses.push(\`DATE(capture_timestamp) <= '\${endDate}'\`);
  if (source) whereClauses.push(\`source = '\${source}'\`);
  if (medium) whereClauses.push(\`medium = '\${medium}'\`);
  
  const whereSql = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';
  
  const query = \`
    SELECT 
      IFNULL(source, 'Unknown') as source,
      COUNT(lead_id) as leads,
      COUNTIF(rpc = true) as rpc_count,
      COUNTIF(sale = true) as sale_count,
      COUNTIF(activation = true) as activation_count,
      SUM(IFNULL(revenue, 0)) as total_revenue
    FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\`
    \${whereSql}
    GROUP BY source
    ORDER BY leads DESC
  \`;

  try {
    const [rows] = await bq.query({ query });
    const sources = rows.map((r: any) => {
      const current = Number(r.leads) || 0;
      return {
        source: r.source,
        leads: current,
        rpc: current > 0 ? Number(((Number(r.rpc_count) / current) * 100).toFixed(1)) : 0,
        sale: current > 0 ? Number(((Number(r.sale_count) / current) * 100).toFixed(1)) : 0,
        activation: current > 0 ? Number(((Number(r.activation_count) / current) * 100).toFixed(1)) : 0,
        cpl: 0,
        cpa: 0,
        roi: 0,
        trend: 0
      };
    });

    const topSource = sources.length > 0 ? sources[0].source : 'N/A';
    const lowestCpa = sources.length > 0 ? sources[0].source : 'N/A';

    return {
      sources,
      topSource,
      lowestCpa
    };
  } catch (error: any) {
    throw new Error(\`BigQuery sources query failed: \${error.message}\`);
  }
}

export async function getQualityStats(params: QueryParams) {
  const { projectId, datasetId, tableId, startDate, endDate, source, medium } = params;
  const bq = getBaseClient(projectId);
  
  let whereClauses = [];
  if (startDate) whereClauses.push(\`DATE(capture_timestamp) >= '\${startDate}'\`);
  if (endDate) whereClauses.push(\`DATE(capture_timestamp) <= '\${endDate}'\`);
  if (source) whereClauses.push(\`source = '\${source}'\`);
  if (medium) whereClauses.push(\`medium = '\${medium}'\`);
  
  const whereSql = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';

  const query = \`
    SELECT
      COUNT(lead_id) as total,
      COUNTIF(duplicate_flag = false) as passed,
      COUNTIF(duplicate_flag = true) as failed
    FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\`
    \${whereSql}
  \`;

  try {
    const [rows] = await bq.query({ query });
    const stats = rows[0] || { total: 0, passed: 0, failed: 0 };
    const total = Number(stats.total) || 0;
    const passed = Number(stats.passed) || 0;
    
    return {
      passRate: total > 0 ? Number(((passed / total) * 100).toFixed(1)) : 0,
      avgScore: 'N/A',
      chart: [
         { grade: 'Valid', leads: passed, rpc: 0, sale: 0 },
         { grade: 'Duplicate', leads: Number(stats.failed) || 0, rpc: 0, sale: 0 }
      ],
      reasons: [
         { reason: 'Duplicate', count: Number(stats.failed) || 0, percentage: total > 0 ? Number(((Number(stats.failed) / total) * 100).toFixed(1)) : 0 }
      ]
    };
  } catch (error: any) {
    throw new Error(\`BigQuery quality query failed: \${error.message}\`);
  }
}

export async function getSpeedToLeadStats(params: QueryParams) {
  const { projectId, datasetId, tableId, startDate, endDate, source, medium } = params;
  const bq = getBaseClient(projectId);
  
  let whereClauses = [];
  if (startDate) whereClauses.push(\`DATE(capture_timestamp) >= '\${startDate}'\`);
  if (endDate) whereClauses.push(\`DATE(capture_timestamp) <= '\${endDate}'\`);
  if (source) whereClauses.push(\`source = '\${source}'\`);
  if (medium) whereClauses.push(\`medium = '\${medium}'\`);
  whereClauses.push(\`delivery_timestamp IS NOT NULL\`);
  whereClauses.push(\`first_call_timestamp IS NOT NULL\`);
  whereClauses.push(\`first_call_timestamp >= delivery_timestamp\`);
  
  const whereSql = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';
  
  // We approximate the speed to lead in minutes
  const query = \`
    WITH stl_data AS (
      SELECT 
        lead_id,
        TIMESTAMP_DIFF(first_call_timestamp, delivery_timestamp, MINUTE) as stl_minutes,
        rpc,
        sale
      FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\`
      \${whereSql}
    )
    SELECT
      AVG(stl_minutes) as avg_stl,
      COUNT(lead_id) as total_called,
      COUNTIF(stl_minutes <= 5) as in_five,
      COUNTIF(stl_minutes <= 60) as in_hour,
      
      COUNTIF(stl_minutes <= 5) as bucket_1_leads,
      COUNTIF(stl_minutes <= 5 AND rpc = true) as bucket_1_rpc,
      COUNTIF(stl_minutes <= 5 AND sale = true) as bucket_1_sale,
      
      COUNTIF(stl_minutes > 5 AND stl_minutes <= 15) as bucket_2_leads,
      COUNTIF(stl_minutes > 5 AND stl_minutes <= 15 AND rpc = true) as bucket_2_rpc,
      COUNTIF(stl_minutes > 5 AND stl_minutes <= 15 AND sale = true) as bucket_2_sale,
      
      COUNTIF(stl_minutes > 15 AND stl_minutes <= 60) as bucket_3_leads,
      COUNTIF(stl_minutes > 15 AND stl_minutes <= 60 AND rpc = true) as bucket_3_rpc,
      COUNTIF(stl_minutes > 15 AND stl_minutes <= 60 AND sale = true) as bucket_3_sale,
      
      COUNTIF(stl_minutes > 60) as bucket_4_leads,
      COUNTIF(stl_minutes > 60 AND rpc = true) as bucket_4_rpc,
      COUNTIF(stl_minutes > 60 AND sale = true) as bucket_4_sale
      
    FROM stl_data
  \`;

  try {
    const [rows] = await bq.query({ query });
    const stats = rows[0] || {};
    const total = Number(stats.total_called) || 0;
    
    return {
      avgStl: stats.avg_stl ? \`\${Math.round(stats.avg_stl)}m\` : 'N/A',
      medianStl: 'N/A', // approximate
      inFiveMin: total > 0 ? Number(((Number(stats.in_five) / total) * 100).toFixed(1)) : 0,
      inHour: total > 0 ? Number(((Number(stats.in_hour) / total) * 100).toFixed(1)) : 0,
      chart: [
        { 
          bucket: '< 5m', 
          leads: Number(stats.bucket_1_leads) || 0,
          rpc: Number(stats.bucket_1_leads) > 0 ? Number(((Number(stats.bucket_1_rpc) / Number(stats.bucket_1_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_1_leads) > 0 ? Number(((Number(stats.bucket_1_sale) / Number(stats.bucket_1_leads)) * 100).toFixed(1)) : 0
        },
        { 
          bucket: '5-15m', 
          leads: Number(stats.bucket_2_leads) || 0,
          rpc: Number(stats.bucket_2_leads) > 0 ? Number(((Number(stats.bucket_2_rpc) / Number(stats.bucket_2_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_2_leads) > 0 ? Number(((Number(stats.bucket_2_sale) / Number(stats.bucket_2_leads)) * 100).toFixed(1)) : 0
        },
        { 
          bucket: '15-60m', 
          leads: Number(stats.bucket_3_leads) || 0,
          rpc: Number(stats.bucket_3_leads) > 0 ? Number(((Number(stats.bucket_3_rpc) / Number(stats.bucket_3_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_3_leads) > 0 ? Number(((Number(stats.bucket_3_sale) / Number(stats.bucket_3_leads)) * 100).toFixed(1)) : 0
        },
        { 
          bucket: '> 1h', 
          leads: Number(stats.bucket_4_leads) || 0,
          rpc: Number(stats.bucket_4_leads) > 0 ? Number(((Number(stats.bucket_4_rpc) / Number(stats.bucket_4_leads)) * 100).toFixed(1)) : 0,
          sale: Number(stats.bucket_4_leads) > 0 ? Number(((Number(stats.bucket_4_sale) / Number(stats.bucket_4_leads)) * 100).toFixed(1)) : 0
        }
      ]
    };
  } catch (error: any) {
    throw new Error(\`BigQuery speed to lead query failed: \${error.message}\`);
  }
}

export async function getCohortStats(params: QueryParams) {
  const { projectId, datasetId, tableId, startDate, endDate, source, medium } = params;
  const bq = getBaseClient(projectId);
  
  let whereClauses = [];
  if (startDate) whereClauses.push(\`DATE(capture_timestamp) >= '\${startDate}'\`);
  if (endDate) whereClauses.push(\`DATE(capture_timestamp) <= '\${endDate}'\`);
  if (source) whereClauses.push(\`source = '\${source}'\`);
  if (medium) whereClauses.push(\`medium = '\${medium}'\`);
  
  const whereSql = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';

  const query = \`
    SELECT
      FORMAT_DATE('%Y-W%W', DATE(capture_timestamp)) as cohort,
      COUNT(lead_id) as size,
      
      -- Sale diffs
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) = 0) as sale_d0,
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) <= 1) as sale_d1,
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) <= 3) as sale_d3,
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) <= 7) as sale_d7,
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) <= 14) as sale_d14,
      COUNTIF(sale = true AND TIMESTAMP_DIFF(sale_timestamp, capture_timestamp, DAY) <= 30) as sale_d30
    FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\`
    \${whereSql}
    GROUP BY cohort
    ORDER BY cohort DESC
    LIMIT 10
  \`;

  try {
    const [rows] = await bq.query({ query });
    return rows.map((r: any) => {
      const size = Number(r.size) || 0;
      return {
        cohort: r.cohort,
        size,
        metrics: {
          d0: size > 0 ? Number(((Number(r.sale_d0) / size) * 100).toFixed(1)) : null,
          d1: size > 0 ? Number(((Number(r.sale_d1) / size) * 100).toFixed(1)) : null,
          d3: size > 0 ? Number(((Number(r.sale_d3) / size) * 100).toFixed(1)) : null,
          d7: size > 0 ? Number(((Number(r.sale_d7) / size) * 100).toFixed(1)) : null,
          d14: size > 0 ? Number(((Number(r.sale_d14) / size) * 100).toFixed(1)) : null,
          d30: size > 0 ? Number(((Number(r.sale_d30) / size) * 100).toFixed(1)) : null
        }
      };
    });
  } catch (error: any) {
    throw new Error(\`BigQuery cohorts query failed: \${error.message}\`);
  }
}

export async function getTimeseriesStats(params: QueryParams) {
  const { projectId, datasetId, tableId, startDate, endDate, source, medium } = params;
  const bq = getBaseClient(projectId);
  
  let whereClauses = [];
  if (startDate) whereClauses.push(\`DATE(capture_timestamp) >= '\${startDate}'\`);
  if (endDate) whereClauses.push(\`DATE(capture_timestamp) <= '\${endDate}'\`);
  if (source) whereClauses.push(\`source = '\${source}'\`);
  if (medium) whereClauses.push(\`medium = '\${medium}'\`);
  
  const whereSql = whereClauses.length > 0 ? \`WHERE \${whereClauses.join(' AND ')}\` : '';

  const query = \`
    SELECT
      CAST(DATE(capture_timestamp) AS STRING) as date,
      COUNT(lead_id) as current
    FROM \\\`\${projectId}.\${datasetId}.\${tableId}\\\`
    \${whereSql}
    GROUP BY date
    ORDER BY date ASC
  \`;

  try {
    const [rows] = await bq.query({ query });
    return rows.map((r: any) => ({
      date: r.date,
      current: Number(r.current) || 0,
      comparison: 0
    }));
  } catch (error: any) {
    throw new Error(\`BigQuery timeseries query failed: \${error.message}\`);
  }
}

`;

fs.appendFileSync('server/queries.ts', code);

