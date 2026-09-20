const fs = require('fs');

const code = `
import express from 'express';
import { BigQuery } from '@google-cloud/bigquery';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'dashboards-422710';
const DATASET = 'lead_ledger';

const bigquery = new BigQuery({
  projectId: PROJECT_ID,
  credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}')
});

const tableClustered = \\\`\${PROJECT_ID}.\${DATASET}.clustered_lead_ledger\\\`;

function buildDateFilter(startDate?: string, endDate?: string, prefix = '', isFirstWhere = true) {
  if (!startDate && !endDate) return '';
  let conditions = [];
  if (startDate) conditions.push(\\\`\${prefix}fetched >= '\${startDate} 00:00:00'\\\`);
  if (endDate) conditions.push(\\\`\${prefix}fetched <= '\${endDate} 23:59:59'\\\`);
  if (conditions.length === 0) return '';
  return (isFirstWhere ? 'WHERE ' : ' AND ') + conditions.join(' AND ');
}

async function runQuery(query: string) {
  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();
    return rows;
  } catch (error) {
    console.error('BigQuery Error:', error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', project: PROJECT_ID });
  });

  app.get('/api/rate-card', async (req, res) => {
    const data = [
      { product: 'MTN Sale', event: 'Sale', amount: 0.00, status: 'Active' },
      { product: 'MTN Sale Activated', event: 'Activation', amount: 200.00, status: 'Active' },
      { product: 'Mondo Sale', event: 'Sale', amount: 10.00, status: 'Active' },
      { product: 'Mondo Sale Activated', event: 'Activation', amount: 0.00, status: 'Inactive' },
      { product: 'BLC Sale', event: 'Sale', amount: 17.00, status: 'Active' },
      { product: 'BLC Sale Activated', event: 'Activation', amount: 0.00, status: 'Inactive' },
      { product: 'BizVoip Sale', event: 'Sale', amount: 20.00, status: 'Active' },
    ];
    res.json({ success: true, data });
  });

  app.get('/api/lead-ledger', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          h.vendor,
          c.lead_id,
          h.transaction_id,
          c.consumer_id,
          c.fetched,
          c.offershop_color_vetting as vetting_status,
          '' as vetted,
          h.attempted_to_deliver,
          h.delivered,
          h.expected_first_dial,
          h.new_dialer_lead,
          h.first_call_date,
          h.last_call_date,
          h.last_dialer_status,
          h.last_call_length_in_sec,
          h.total_calls_length_in_sec,
          h.total_calls,
          h.rpc,
          h.sale,
          h.activated,
          16.2 as lead_cost,
          h.revenue_generated,
          c.offershop_source
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        \${buildDateFilter(startDate, endDate, 'c.', true)}
        LIMIT 100
      \\\`;
      const rows = await runQuery(query);
      const safeRows = rows.map((r: any) => ({
        ...r,
        lead_id: r.lead_id ? r.lead_id.substring(0, 3) + '****' + r.lead_id.substring(r.lead_id.length - 2) : null
      }));
      res.json({ success: true, data: safeRows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/insights', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT
          COUNT(*) as total_leads,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as total_sales,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as total_revenue,
          AVG((SELECT AVG(h.total_calls_length_in_sec) FROM UNNEST(c.hlc_details) h)) as avg_talk_time
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/overview', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          COUNT(*) as Fetched_Leads,
          COUNT(*) * 16.2 as Amount_Spent,
          COUNTIF(c.valid_idno = 'true') as Valid_IDNumber,
          COUNTIF(c.phone_valid = 'true') as Valid_Phone,
          COUNTIF(c.offershop_color_vetting = 'Green') as Total_Leads_Passed_BLC_Vetting,
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as Delivered_Leads,
          SUM((SELECT COUNTIF(h.total_calls > 0) FROM UNNEST(c.hlc_details) h)) as Dialed_Leads,
          SUM((SELECT COUNTIF(h.total_calls_length_in_sec > 0) FROM UNNEST(c.hlc_details) h)) as Answered_Calls,
          SUM((SELECT SUM(h.rpc) FROM UNNEST(c.hlc_details) h)) as RPC,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as Sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as Activations
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/funnel', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          COUNT(*) as Fetched_Leads,
          COUNTIF(c.valid_idno = 'true' AND c.phone_valid = 'true') as Valid_Leads,
          COUNTIF(c.offershop_color_vetting = 'Green') as Vetted_Leads,
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as Delivered_Leads,
          SUM((SELECT COUNTIF(h.total_calls > 0) FROM UNNEST(c.hlc_details) h)) as Dialed_Leads,
          SUM((SELECT COUNTIF(h.total_calls_length_in_sec > 0) FROM UNNEST(c.hlc_details) h)) as Answered_Calls,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as Sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as Activations
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      const data = rows[0] || {};
      
      const stages = [
        { stage: 'Fetched', count: data.Fetched_Leads || 0, percentage: 100 },
        { stage: 'Valid (ID & Phone)', count: data.Valid_Leads || 0, percentage: ((data.Valid_Leads || 0) / (data.Fetched_Leads || 1)) * 100 },
        { stage: 'Vetted', count: data.Vetted_Leads || 0, percentage: ((data.Vetted_Leads || 0) / (data.Valid_Leads || 1)) * 100 },
        { stage: 'Delivered', count: data.Delivered_Leads || 0, percentage: ((data.Delivered_Leads || 0) / (data.Vetted_Leads || 1)) * 100 },
        { stage: 'Dialed', count: data.Dialed_Leads || 0, percentage: ((data.Dialed_Leads || 0) / (data.Delivered_Leads || 1)) * 100 },
        { stage: 'Answered', count: data.Answered_Calls || 0, percentage: ((data.Answered_Calls || 0) / (data.Dialed_Leads || 1)) * 100 },
        { stage: 'Sales', count: data.Sales || 0, percentage: ((data.Sales || 0) / (data.Answered_Calls || 1)) * 100 },
        { stage: 'Activations', count: data.Activations || 0, percentage: ((data.Activations || 0) / (data.Sales || 1)) * 100 },
      ];
      
      res.json({ success: true, data: stages });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/pipeline-waterfall', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          COUNT(*) * 16.2 as total_spend,
          COUNT(*) as fetched,
          COUNTIF(c.valid_idno = 'true') as valid_id,
          COUNTIF(c.phone_valid = 'true') as valid_phone,
          COUNTIF(c.offershop_color_vetting = 'Green') as vetting_passed,
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as delivered,
          SUM((SELECT COUNTIF(h.total_calls > 0) FROM UNNEST(c.hlc_details) h)) as dialed,
          SUM((SELECT COUNTIF(h.total_calls_length_in_sec > 0) FROM UNNEST(c.hlc_details) h)) as answered,
          SUM((SELECT SUM(h.rpc) FROM UNNEST(c.hlc_details) h)) as rpc,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as activated
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      const data = rows[0] || {};
      
      const stages = [
        { name: 'Fetched', key: 'fetched' },
        { name: 'Valid ID', key: 'valid_id' },
        { name: 'Valid Phone', key: 'valid_phone' },
        { name: 'Vetting Passed', key: 'vetting_passed' },
        { name: 'Delivered', key: 'delivered' },
        { name: 'Dialed', key: 'dialed' },
        { name: 'Answered', key: 'answered' },
        { name: 'Sales', key: 'sales' },
        { name: 'Activated', key: 'activated' }
      ];
      
      const waterfall = stages.map((s, i) => {
        const val = data[s.key] || 0;
        const prevVal = i > 0 ? (data[stages[i-1].key] || 1) : val;
        const drop = i > 0 ? prevVal - val : 0;
        const dropPct = i > 0 ? (drop / prevVal) * 100 : 0;
        return {
          stage: s.name,
          value: val,
          dropoff: drop,
          dropoffPct: dropPct,
          conversionRate: val / (data.fetched || 1)
        };
      });
      
      res.json({ success: true, data: { waterfall, total_spend: data.total_spend || 0 } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/revenue', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          c.offershop_source as Offershop_Source,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as MTN_Sales,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as revenue,
          0 as duplicate_failures
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
        GROUP BY c.offershop_source
      \\\`;
      const rows = await runQuery(query);
      const enrichedData = rows.map((row: any) => ({
        source: row.Offershop_Source || 'Unknown',
        sales: row.MTN_Sales || 0,
        revenue: row.revenue || 0,
        duplicates: row.duplicate_failures || 0,
        cpa: row.MTN_Sales ? ((row.MTN_Sales * 16.2) / row.MTN_Sales) : 0 
      }));
      res.json({ success: true, data: enrichedData });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/commercial-control', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          c.offershop_source,
          COUNT(*) * 16.2 as spend,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as revenue
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
        GROUP BY c.offershop_source
        ORDER BY revenue DESC
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/sources', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          c.offershop_source as source,
          COUNT(*) as leads,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as revenue
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
        GROUP BY source
        ORDER BY leads DESC
        LIMIT 10
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/vendors', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          h.vendor as source,
          COUNT(*) as leads,
          COUNT(*) * 16.2 as spend,
          SUM(IF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '', 1, 0)) as sales,
          SUM(h.revenue_generated) as revenue
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        WHERE h.vendor IS NOT NULL AND h.vendor != ''
        \${buildDateFilter(startDate, endDate, 'c.', false)}
        GROUP BY source
        ORDER BY revenue DESC
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/agents', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          h.vendor as agent,
          SUM(h.total_calls) as calls_made,
          SUM(h.total_calls_length_in_sec) as total_talk_time,
          SUM(IF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '', 1, 0)) as sales,
          SUM(IF(h.last_dialer_status = 'Scheduled', 1, 0)) as callbacks,
          SUM(IF(h.last_dialer_status LIKE '%No answer%', 1, 0)) as no_answers
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        WHERE h.vendor IS NOT NULL AND h.vendor != ''
        \${buildDateFilter(startDate, endDate, 'c.', false)}
        GROUP BY agent
        ORDER BY sales DESC
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/call-heatmap', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          EXTRACT(DAYOFWEEK FROM SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.last_call_date)) as day_of_week,
          EXTRACT(HOUR FROM SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.last_call_date)) as hour_of_day,
          COUNT(*) as dials
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        WHERE h.last_call_date IS NOT NULL AND h.last_call_date != '' AND h.last_call_date != '1970-01-01 00:00:01'
        \${buildDateFilter(startDate, endDate, 'c.', false)}
        GROUP BY day_of_week, hour_of_day
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/calls', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          SUM((SELECT SUM(h.total_calls) FROM UNNEST(c.hlc_details) h)) as total_calls,
          COUNT(DISTINCT c.lead_id) as unique_leads,
          4 as active_agents,
          AVG((SELECT AVG(h.total_calls_length_in_sec) FROM UNNEST(c.hlc_details) h)) as avg_call_length,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT COUNTIF(h.last_dialer_status = 'Scheduled') FROM UNNEST(c.hlc_details) h)) as callbacks,
          SUM((SELECT COUNTIF(h.last_dialer_status LIKE '%No answer%') FROM UNNEST(c.hlc_details) h)) as no_answers,
          SUM((SELECT COUNTIF(h.last_dialer_status LIKE '%Decline%') FROM UNNEST(c.hlc_details) h)) as declined,
          SUM((SELECT COUNTIF(h.last_dialer_status LIKE '%Wrong%') FROM UNNEST(c.hlc_details) h)) as wrong_numbers,
          0 as dnc
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/call-results', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          h.last_dialer_status as call_result,
          COUNT(*) as count
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        WHERE h.last_dialer_status IS NOT NULL AND h.last_dialer_status != ''
        \${buildDateFilter(startDate, endDate, 'c.', false)}
        GROUP BY call_result
        ORDER BY count DESC
        LIMIT 20
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/lifecycle', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          COUNT(*) as fetched,
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as delivered,
          SUM((SELECT SUM(h.total_calls) FROM UNNEST(c.hlc_details) h)) as calls,
          SUM((SELECT SUM(h.rpc) FROM UNNEST(c.hlc_details) h)) as rpc,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as activated,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as revenue
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows[0] });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/speed-to-lead', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        WITH buckets AS (
          SELECT 
            CASE 
              WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', c.fetched), HOUR) < 24 THEN 'Under 24h'
              WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', c.fetched), DAY) < 3 THEN '1-3 days'
              WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', c.fetched), DAY) < 7 THEN '3-7 days'
              WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', h.first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', c.fetched), DAY) < 30 THEN '7-30 days'
              ELSE '30+ days'
            END as speed_bucket,
            h.sale
          FROM \\\\\\\`\${tableClustered}\\\\\\\` c
          LEFT JOIN UNNEST(c.hlc_details) as h
          WHERE h.first_call_date IS NOT NULL AND h.first_call_date != '1970-01-01 00:00:01' AND h.first_call_date != '' AND c.fetched IS NOT NULL
          \${buildDateFilter(startDate, endDate, 'c.', false)}
        )
        SELECT 
          speed_bucket,
          COUNT(*) as leads,
          SUM(IF(sale IS NOT NULL AND sale != '1970-01-01 00:00:01' AND sale != '', 1, 0)) as sales,
          COUNT(*) as calls
        FROM buckets
        GROUP BY speed_bucket
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/retry-strategy', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          h.total_calls as attempt_number,
          SUM(h.total_calls) as calls,
          COUNT(DISTINCT c.lead_id) as leads,
          SUM(IF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '', 1, 0)) as sales
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        LEFT JOIN UNNEST(c.hlc_details) as h
        WHERE h.total_calls > 0
        \${buildDateFilter(startDate, endDate, 'c.', false)}
        GROUP BY attempt_number
        ORDER BY attempt_number ASC
        LIMIT 10
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const generateBrandQuery = (brand: string) => async (req: express.Request, res: express.Response) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          SUM((SELECT COUNTIF(h.delivered IS NOT NULL AND h.delivered != '1970-01-01 00:00:01' AND h.delivered != '') FROM UNNEST(c.hlc_details) h)) as delivered,
          SUM((SELECT COUNTIF(h.sale IS NOT NULL AND h.sale != '1970-01-01 00:00:01' AND h.sale != '') FROM UNNEST(c.hlc_details) h)) as sales,
          SUM((SELECT COUNTIF(h.activated IS NOT NULL AND h.activated != '1970-01-01 00:00:01' AND h.activated != '') FROM UNNEST(c.hlc_details) h)) as activated,
          COUNT(*) * 16.2 as spend,
          SUM((SELECT SUM(h.revenue_generated) FROM UNNEST(c.hlc_details) h)) as revenue
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        WHERE (SELECT COUNTIF(LOWER(h.vendor) LIKE LOWER('%\${brand}%')) FROM UNNEST(c.hlc_details) h) > 0
        \${buildDateFilter(startDate, endDate, 'c.', false)}
      \\\`;
      const rows = await runQuery(query);
      res.json({ success: true, data: rows[0] || { delivered: 0, sales: 0, activated: 0, spend: 0, revenue: 0 } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get('/api/brand/mondo', generateBrandQuery('Mondo'));
  app.get('/api/brand/blc', generateBrandQuery('BLC'));
  app.get('/api/brand/mtn', generateBrandQuery('MTN'));

  app.get('/api/data-quality', async (req, res) => {
    try {
      const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
      const query = \\\`
        SELECT 
          COUNTIF(c.consumer_id IS NULL OR c.consumer_id = 0) as null_fetched,
          0 as null_spend,
          COUNT(*) as total_offline
        FROM \\\\\\\`\${tableClustered}\\\\\\\` c
        \${buildDateFilter(startDate, endDate, 'c.', true)}
      \\\`;
      
      const [rows] = await Promise.all([runQuery(query)]);
      const offline = rows[0] || {};
      
      res.json({ 
        success: true, 
        data: {
          callQuality: {
            blank_agent: 0,
            zero_second_calls: 0,
            null_lead_id: 0,
            total_calls: 1
          },
          offlineQuality: {
            null_fetched: offline.null_fetched || 0,
            null_spend: offline.null_spend || 0,
            total_offline: offline.total_offline || 1
          }
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(\\\`Server running on port \\\${port}\\\`);
  });
}

startServer();
`;

// It is much easier to just write the string directly
fs.writeFileSync('server.ts', code);
