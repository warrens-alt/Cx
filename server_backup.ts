import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { BigQuery } from '@google-cloud/bigquery';
import cors from 'cors';
import compression from 'compression';

const app = express();
const PORT = 3000;

app.use(compression());
app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const PROJECT_ID = 'dashboards-422710';
const DATASET = 'vibe_coding_data';

function getBigQueryClient() {
  const credsStr = process.env.BIGQUERY_CREDENTIALS;
  if (!credsStr) {
    throw new Error('BIGQUERY_CREDENTIALS environment variable is not set.');
  }
  return new BigQuery({ credentials: JSON.parse(credsStr), projectId: PROJECT_ID });
}

const tableOffline = `${PROJECT_ID}.${DATASET}.tbl_vibe_code_warren_stear_ontact_ofline_data`;
const tableLedger = `${PROJECT_ID}.${DATASET}.tbl_offershop_lead_ledger`;
const tableCall = `${PROJECT_ID}.${DATASET}.tbl_vibe_code_warren_stear_ontact_analytics_api`;

function buildDateFilter(startDate?: string, endDate?: string, columnConfig: { type: 'date' | 'fetched' | 'call_date', tableAlias?: string } = { type: 'date' }, isFirstWhere = true) {
  if (!startDate && !endDate) return '';
  const prefix = columnConfig.tableAlias ? columnConfig.tableAlias + '.' : '';
  let conditions = [];
  
  if (columnConfig.type === 'date') {
    if (startDate) conditions.push(`${prefix}date >= '${startDate}'`);
    if (endDate) conditions.push(`${prefix}date <= '${endDate}'`);
  } else if (columnConfig.type === 'fetched') {
    if (startDate) conditions.push(`${prefix}fetched >= '${startDate} 00:00:00'`);
    if (endDate) conditions.push(`${prefix}fetched <= '${endDate} 23:59:59'`);
  } else if (columnConfig.type === 'call_date') {
    if (startDate) conditions.push(`DATE(${prefix}call_date) >= '${startDate}'`);
    if (endDate) conditions.push(`DATE(${prefix}call_date) <= '${endDate}'`);
  }
  
  if (conditions.length === 0) return '';
  return (isFirstWhere ? 'WHERE ' : ' AND ') + conditions.join(' AND ');
}


const queryCache = new Map<string, { timestamp: number, data: any }>();

const runQuery = async (query: string, params: any = {}, useCache = true) => {
  try {
    const cacheKey = query + JSON.stringify(params);
    if (useCache) {
      const cached = queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
        return cached.data;
      }
    }

    const bq = getBigQueryClient();
    const [rows] = await bq.query({ query, params });
    
    if (useCache) {
      queryCache.set(cacheKey, { timestamp: Date.now(), data: rows });
    }
    return rows;
  } catch (error: any) {
    console.error('BigQuery Error:', error);
    throw new Error(error.message);
  }
};

app.get('/api/rate-card', async (req, res) => {
  try {
    const data = [
      { brand: 'Mondo', segment: 'Class A', event: 'Sale', rate: 450, volume: 1500, revenue: 675000, status: 'Mapped' },
      { brand: 'Mondo', segment: 'Class B', event: 'Sale', rate: 300, volume: 1200, revenue: 360000, status: 'Mapped' },
      { brand: 'Mondo', segment: 'Class C', event: 'Sale', rate: 150, volume: 800, revenue: 120000, status: 'Mapped' },
      { brand: 'Mondo', segment: 'Class D', event: 'Sale', rate: 50, volume: 300, revenue: 15000, status: 'Mapped' },
      { brand: 'MTN', segment: 'All', event: 'Activation', rate: 200, volume: 420, revenue: 84000, status: 'Mapped' },
      { brand: 'BLC', segment: 'Unknown', event: 'Activation', rate: 0, volume: 0, revenue: 0, status: 'Unmapped' }
    ];
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lead-ledger', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        vendor,
        lead_id,
        transaction_id,
        consumer_id,
        CAST(fetched AS STRING) as fetched,
        vetting_status,
        CAST(vetted AS STRING) as vetted,
        CAST(attempted_to_deliver AS STRING) as attempted_to_deliver,
        CAST(delivered AS STRING) as delivered,
        CAST(expected_first_dial AS STRING) as expected_first_dial,
        new_dialer_lead,
        CAST(first_call_date AS STRING) as first_call_date,
        CAST(last_call_date AS STRING) as last_call_date,
        last_dialer_status,
        last_call_length_in_sec,
        total_calls_length_in_sec,
        total_calls,
        rpc,
        CAST(sale AS STRING) as sale,
        CAST(activated AS STRING) as activated,
        lead_cost,
        revenue_generated,
        offershop_source
      FROM ${tableLedger}
      ${buildDateFilter(startDate, endDate, { type: 'fetched' }, true)}
      LIMIT 100
    `;
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

    const query = `
      SELECT 
        SUM(Amount_Spent) as total_spend,
        SUM(Fetched_Leads) as fetched_leads,
        SUM(MTN_Sales) as mtn_sales,
        SUM(MTN_Activated_Sales) as mtn_activations
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    const data = rows[0] || {};
    
    const roi = data.total_spend ? (((data.mtn_activations * 200) - data.total_spend) / data.total_spend) : 0;
    const activationRate = data.mtn_sales ? (data.mtn_activations / data.mtn_sales) : 0;

    const insights = [];
    
    if (roi < 0) {
      insights.push({
        title: "Negative Overall ROI",
        value: `${(roi * 100).toFixed(1)}%`,
        metric: "ROI",
        recommendation: "Review high-spend, low-converting sources and pause immediately.",
        severity: "critical"
      });
    } else {
      insights.push({
        title: "Positive Overall ROI",
        value: `+${(roi * 100).toFixed(1)}%`,
        metric: "ROI",
        recommendation: "Maintain profitable sources and slowly scale winning campaigns.",
        severity: "positive"
      });
    }
    
    if (activationRate < 0.2) {
      insights.push({
        title: "Low MTN Activation Rate",
        value: `${(activationRate * 100).toFixed(1)}%`,
        metric: "Activation Rate",
        recommendation: "A large number of MTN sales are not activating. Investigate billing pipeline.",
        severity: "warning"
      });
    }

    insights.push({
        title: "BLC Revenue Mapping",
        value: "Unmapped",
        metric: "Segment Exposure",
        recommendation: "BLC revenue cannot be calculated precisely because activation segments are missing from offline data.",
        severity: "warning"
    });

    res.json({ success: true, data: insights });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Amount_Spent) as total_spend,
        SUM(Fetched_Leads) as fetched_leads,
        SUM(Accepted_Leads) as accepted_leads,
        SUM(Qualified_Leads) as qualified_leads,
        SUM(Total_Leads_Delivered_OnTact) as delivered_leads,
        SUM(MTN_Dialed_Leads) as dialed_leads,
        SUM(MTN_Answered_Calls) as answered_calls,
        SUM(MTN_Right_Party_Contact) as rpc,
        SUM(MTN_Sales) as sales,
        SUM(MTN_Delivered_Sales) as delivered_sales,
        SUM(MTN_Activated_Sales) as activated_sales,
        
        -- Calculated Revenue (Rate Card)
        SUM(
          COALESCE(Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(Total_Leads_Sold_D, 0) * 10.0 +
          COALESCE(MTN_Activated_Sales, 0) * 200.0
        ) as revenue_generated
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/funnel', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Amount_Spent) as Spend,
        SUM(Impressions) as Impressions,
        SUM(Clicks) as Clicks,
        SUM(Landing_Page_View) as Landing_Page_Views,
        SUM(Form_Completion) as Form_Completions,
        SUM(Fetched_Leads) as Fetched_Leads,
        SUM(Qualified_Leads) as Qualified_Leads,
        SUM(Total_Leads_Delivered_OnTact) as Delivered_Leads,
        SUM(MTN_Dialed_Leads) as Dialed_Leads,
        SUM(MTN_Answered_Calls) as Answered_Calls,
        SUM(MTN_Right_Party_Contact) as RPC,
        SUM(MTN_Sales) as Sales,
        SUM(MTN_Activated_Sales) as Activations
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/pipeline-waterfall', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Amount_Spent) as total_spend,
        SUM(Fetched_Leads) as fetched,
        SUM(Standardised_ID_Number) as std_id,
        SUM(Standardised_Phone_Number) as std_phone,
        SUM(Standardised_EmailAddress) as std_email,
        SUM(Valid_IDNumber) as valid_id,
        SUM(Valid_Phone) as valid_phone,
        SUM(Total_Leads_Passed_BLC_Vetting) as vetting_passed,
        SUM(Total_Leads_Dedupe_Passed_BLC) as dedupe_passed,
        SUM(Total_Leads_Attempted_To_Delivered_OnTact) as attempted_delivery,
        SUM(Total_Leads_Delivered_OnTact) as delivered,
        SUM(Accepted_Leads) as accepted,
        SUM(MTN_Dialed_Leads) as dialed,
        SUM(MTN_Answered_Calls) as answered,
        SUM(MTN_Right_Party_Contact) as rpc,
        SUM(MTN_Sales) as sales,
        SUM(MTN_Activated_Sales) as activated
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    const data = rows[0] || {};
    
    const stages = [
      { name: 'Fetched', key: 'fetched' },
      { name: 'Standardised ID', key: 'std_id' },
      { name: 'Standardised Phone', key: 'std_phone' },
      { name: 'Standardised Email', key: 'std_email' },
      { name: 'Valid ID', key: 'valid_id' },
      { name: 'Valid Phone', key: 'valid_phone' },
      { name: 'Vetting Passed', key: 'vetting_passed' },
      { name: 'Dedupe Passed', key: 'dedupe_passed' },
      { name: 'Attempted Delivery', key: 'attempted_delivery' },
      { name: 'Delivered', key: 'delivered' },
      { name: 'Accepted', key: 'accepted' },
      { name: 'Dialed', key: 'dialed' },
      { name: 'Answered', key: 'answered' },
      { name: 'RPC', key: 'rpc' },
      { name: 'Sales', key: 'sales' },
      { name: 'Activated', key: 'activated' }
    ];

    let cpl = data.fetched > 0 ? (data.total_spend / data.fetched) : 0;
    
    let waterfall = [];
    // Start with strict logic - enforcing logical bounds 
    // Wait, the instructions say: "enforces strict logical bounds backwards through this funnel"
    // This implies that if a downstream stage has MORE volume than an upstream stage, the upstream stage is adjusted up. 
    // E.g. Sales cannot be > RPC. If Sales is 10 and RPC is 8, RPC must be at least 10.
    
    let rawVals = stages.map(s => data[s.key] || 0);
    for (let i = rawVals.length - 2; i >= 0; i--) {
      if (rawVals[i] < rawVals[i + 1]) {
        rawVals[i] = rawVals[i + 1];
      }
    }
    
    let currentVolume = rawVals[0];
    let totalVolumeDecay = 0;
    let totalCapitalDecay = 0;
    
    for (let i = 0; i < stages.length; i++) {
      let val = rawVals[i];
      let dropOff = 0;
      let dropOffPercent = 0;
      let capitalDecay = 0;
      
      if (i > 0) {
         dropOff = currentVolume - val;
         dropOffPercent = currentVolume > 0 ? (dropOff / currentVolume) : 0;
         capitalDecay = dropOff * cpl;
         totalVolumeDecay += dropOff;
         totalCapitalDecay += capitalDecay;
      }
      
      waterfall.push({
        stage: stages[i].name,
        sustainedVolume: val,
        volumeDecayed: dropOff,
        decayPercent: dropOffPercent,
        capitalDecay: capitalDecay
      });
      
      currentVolume = val;
    }
    
    res.json({ 
      success: true, 
      data: {
        total_spend: data.total_spend || 0,
        base_cpl: cpl,
        total_volume_decay: totalVolumeDecay,
        total_capital_decay: totalCapitalDecay,
        gross_leaded_volume: waterfall[0].sustainedVolume,
        waterfall
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/revenue', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        date as fetch_date,
        SUM(Amount_Spent) as total_spend,
        SUM(
          COALESCE(Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(Total_Leads_Sold_D, 0) * 10.0 +
          COALESCE(MTN_Activated_Sales, 0) * 200.0
        ) as total_revenue
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
      GROUP BY date
      ORDER BY date ASC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/commercial-control', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        offershop_source as source,
        SUM(Amount_Spent) as spend,
        SUM(Fetched_Leads) as leads,
        SUM(MTN_Sales) as sales,
        SUM(MTN_Activated_Sales) as activations,
        SUM(
          COALESCE(Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(Total_Leads_Sold_D, 0) * 10.0 +
          COALESCE(MTN_Activated_Sales, 0) * 200.0
        ) as revenue,
        SUM(Total_Leads_Failed_InternalDuplicate_Check_BLC + Total_Leads_Failed_InternalDuplicate_Check_MTN + Total_Leads_Failed_InternalDuplicate_Check_Mondo) as duplicate_failures
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
      GROUP BY offershop_source
    `;
    const rows = await runQuery(query);
    
    const enrichedData = rows.map((row: any) => {
      const profit = (row.revenue || 0) - (row.spend || 0);
      const roi = row.spend ? profit / row.spend : 0;
      const activationRate = row.sales ? row.activations / row.sales : 0;
      
      let recommendation = 'Maintain';
      if (roi > 0.2 && activationRate > 0.1) recommendation = 'Scale';
      else if (roi < -0.1) recommendation = 'Pause';
      else if (row.duplicate_failures > (row.leads * 0.2)) recommendation = 'Investigate';
      
      return { ...row, profit, roi, recommendation };
    });
    
    res.json({ success: true, data: enrichedData.sort((a, b) => b.profit - a.profit) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sources', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        offershop_source as source,
        SUM(Amount_Spent) as spend,
        SUM(Fetched_Leads) as leads,
        SUM(MTN_Sales) as sales,
        SUM(MTN_Activated_Sales) as activations,
        SUM(
          COALESCE(Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(Total_Leads_Sold_D, 0) * 10.0 +
          COALESCE(MTN_Activated_Sales, 0) * 200.0
        ) as revenue
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
      GROUP BY offershop_source
      ORDER BY revenue DESC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vendors', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      WITH VendorMapping AS (
        SELECT DISTINCT offershop_source, vendor 
        FROM ${tableLedger} 
        WHERE vendor IS NOT NULL AND vendor != '' ${buildDateFilter(startDate, endDate, { type: 'fetched' }, false)}
      )
      SELECT 
        COALESCE(v.vendor, o.offershop_source) as source,
        SUM(o.Amount_Spent) as spend,
        SUM(o.Fetched_Leads) as leads,
        SUM(o.MTN_Sales) as sales,
        SUM(o.MTN_Activated_Sales) as activations,
        SUM(
          COALESCE(o.Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(o.Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(o.Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(o.Total_Leads_Sold_D, 0) * 10.0 +
          COALESCE(o.MTN_Activated_Sales, 0) * 200.0
        ) as revenue
      FROM ${tableOffline} o
      ${buildDateFilter(startDate, endDate, { type: 'date', tableAlias: 'o' }, true)}
      LEFT JOIN VendorMapping v ON o.offershop_source = v.offershop_source
      GROUP BY source
      ORDER BY revenue DESC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/agents', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        agent,
        COUNT(*) as total_calls,
        COUNT(DISTINCT lead_id) as unique_leads,
        SUM(length_in_sec) as total_talk_time,
        SUM(CASE WHEN call_result IN ('SALE', 'Sale Made') THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN call_result IN ('CALLBK', 'Call Back') THEN 1 ELSE 0 END) as callbacks,
        SUM(CASE WHEN call_result IN ('N', 'No Answer') THEN 1 ELSE 0 END) as no_answers
      FROM ${tableCall}
      WHERE agent IS NOT NULL AND agent != '' ${buildDateFilter(startDate, endDate, { type: 'call_date' }, false)}
      GROUP BY agent
      ORDER BY sales DESC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/call-heatmap', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };
    const query = `
      SELECT 
        EXTRACT(DAYOFWEEK FROM call_date) as day_of_week,
        EXTRACT(HOUR FROM call_date) as hour_of_day,
        COUNT(*) as dials
      FROM ${tableCall}
      WHERE call_date IS NOT NULL ${buildDateFilter(startDate, endDate, { type: 'call_date' }, false)}
      GROUP BY day_of_week, hour_of_day
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/calls', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        COUNT(*) as total_calls,
        COUNT(DISTINCT lead_id) as unique_leads,
        COUNT(DISTINCT agent) as active_agents,
        SUM(length_in_sec) as total_talk_time,
        AVG(length_in_sec) as avg_call_length,
        SUM(CASE WHEN call_result IN ('SALE', 'Sale Made') THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN call_result IN ('CALLBK', 'Call Back') THEN 1 ELSE 0 END) as callbacks,
        SUM(CASE WHEN call_result IN ('N', 'No Answer') THEN 1 ELSE 0 END) as no_answers,
        SUM(CASE WHEN call_result IN ('DEC', 'Declined Sale') THEN 1 ELSE 0 END) as declined,
        SUM(CASE WHEN call_result IN ('WrngN', 'Wrong Number') THEN 1 ELSE 0 END) as wrong_numbers,
        SUM(CASE WHEN call_result = 'DNC' THEN 1 ELSE 0 END) as dnc
      FROM ${tableCall}
      ${buildDateFilter(startDate, endDate, { type: 'call_date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/call-results', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        call_result,
        COUNT(*) as count
      FROM ${tableCall}
      WHERE call_result IS NOT NULL AND call_result != '' ${buildDateFilter(startDate, endDate, { type: 'call_date' }, false)}
      GROUP BY call_result
      ORDER BY count DESC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/lifecycle', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        COUNT(lead_id) as fetched,
        SUM(CASE WHEN vetted = 'Yes' THEN 1 ELSE 0 END) as vetted,
        SUM(CASE WHEN attempted_to_deliver = 'Yes' THEN 1 ELSE 0 END) as attempted_deliver,
        SUM(CASE WHEN delivered = 'Yes' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN new_dialer_lead = 1 THEN 1 ELSE 0 END) as dialed,
        SUM(rpc) as rpc,
        SUM(CASE WHEN sale = 'Yes' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN activated = 'Yes' THEN 1 ELSE 0 END) as activated,
        SUM(revenue_generated) as revenue
      FROM ${tableLedger}
      ${buildDateFilter(startDate, endDate, { type: 'fetched' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/speed-to-lead', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      WITH buckets AS (
        SELECT 
          lead_id,
          sale,
          activated,
          revenue_generated,
          CASE 
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), HOUR) < 1 THEN 'Under 1 hour'
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), HOUR) < 6 THEN '1-6 hours'
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), HOUR) < 24 THEN '6-24 hours'
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), DAY) < 3 THEN '1-3 days'
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), DAY) < 7 THEN '3-7 days'
            WHEN TIMESTAMP_DIFF(SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', first_call_date), SAFE.PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', fetched), DAY) < 30 THEN '7-30 days'
            ELSE '30+ days'
          END as speed_bucket
        FROM ${tableLedger}
        WHERE first_call_date IS NOT NULL AND fetched IS NOT NULL ${buildDateFilter(startDate, endDate, { type: 'fetched' }, false)}
      )
      SELECT 
        speed_bucket,
        COUNT(*) as leads,
        SUM(CASE WHEN sale = 'Yes' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN activated = 'Yes' THEN 1 ELSE 0 END) as activations,
        SUM(revenue_generated) as revenue
      FROM buckets
      GROUP BY speed_bucket
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/retry-strategy', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      WITH ranked_calls AS (
        SELECT 
          lead_id,
          call_result,
          length_in_sec,
          ROW_NUMBER() OVER (PARTITION BY lead_id ORDER BY call_date ASC) as attempt_number
        FROM ${tableCall}
        WHERE lead_id IS NOT NULL ${buildDateFilter(startDate, endDate, { type: 'call_date' }, false)}
      )
      SELECT 
        attempt_number,
        COUNT(*) as calls,
        COUNT(DISTINCT lead_id) as leads,
        SUM(CASE WHEN call_result IN ('SALE', 'Sale Made') THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN call_result IN ('CALLBK', 'Call Back') THEN 1 ELSE 0 END) as callbacks,
        SUM(CASE WHEN call_result IN ('N', 'No Answer') THEN 1 ELSE 0 END) as no_answers,
        AVG(length_in_sec) as avg_length
      FROM ranked_calls
      WHERE attempt_number <= 10
      GROUP BY attempt_number
      ORDER BY attempt_number ASC
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brand/mondo', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Total_Mondo_Grade_Passed_Lead) as grade_passed,
        SUM(Total_Leads_Dedupe_Passed_Mondo) as dedupe_passed,
        SUM(Total_Leads_Delivered_Mondo) as delivered,
        SUM(Total_Leads_Sold_A) as sold_a,
        SUM(Total_Leads_Sold_B) as sold_b,
        SUM(Total_Leads_Sold_C) as sold_c,
        SUM(Total_Leads_Sold_D) as sold_d,
        SUM(Amount_Spent) as spend,
        SUM(
          COALESCE(Total_Leads_Sold_A, 0) * 75.0 +
          COALESCE(Total_Leads_Sold_B, 0) * 17.0 +
          COALESCE(Total_Leads_Sold_C, 0) * 10.0 +
          COALESCE(Total_Leads_Sold_D, 0) * 10.0
        ) as revenue
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brand/blc', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Total_Leads_Passed_BLC_Vetting) as passed_vetting,
        SUM(Total_Leads_Failed_InternalDuplicate_Check_BLC) as failed_duplicate,
        SUM(Total_Leads_Failed_BLC_DNCList_BLC) as failed_dnc,
        SUM(Total_Leads_Dedupe_Passed_BLC) as dedupe_passed,
        SUM(Total_Leads_Delivered_OnTact) as delivered,
        SUM(Amount_Spent) as spend
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brand/mtn', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const query = `
      SELECT 
        SUM(Total_Leads_Is_MTN_Lead) as mtn_leads,
        SUM(Total_Leads_Device) as device_leads,
        SUM(Total_Leads_FWA) as fwa_leads,
        SUM(Total_Leads_SimOnly) as sim_only_leads,
        SUM(Total_Leads_SMS_Passed) as sms_passed,
        SUM(Total_Leads_Delivered_MTN) as delivered,
        SUM(MTN_Dialed_Leads) as dialed,
        SUM(MTN_Answered_Calls) as answered,
        SUM(MTN_Right_Party_Contact) as rpc,
        SUM(MTN_Sales) as sales,
        SUM(MTN_Activated_Sales) as activated,
        SUM(Amount_Spent) as spend,
        SUM(COALESCE(MTN_Activated_Sales, 0) * 200.0) as revenue
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    const rows = await runQuery(query);
    res.json({ success: true, data: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/data-quality', async (req, res) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string, endDate?: string };

    const callQuery = `
      SELECT 
        SUM(CASE WHEN call_result IS NULL OR call_result = '' THEN 1 ELSE 0 END) as blank_status,
        SUM(CASE WHEN agent IS NULL OR agent = '' THEN 1 ELSE 0 END) as blank_agent,
        SUM(CASE WHEN length_in_sec = 0 THEN 1 ELSE 0 END) as zero_second_calls,
        SUM(CASE WHEN lead_id IS NULL THEN 1 ELSE 0 END) as null_lead_id,
        COUNT(*) as total_calls
      FROM ${tableCall}
      ${buildDateFilter(startDate, endDate, { type: 'call_date' }, true)}
    `;
    const offlineQuery = `
      SELECT 
        SUM(CASE WHEN Fetched_Leads IS NULL THEN 1 ELSE 0 END) as null_fetched,
        SUM(CASE WHEN Amount_Spent IS NULL THEN 1 ELSE 0 END) as null_spend,
        COUNT(*) as total_offline
      FROM ${tableOffline}
      ${buildDateFilter(startDate, endDate, { type: 'date' }, true)}
    `;
    
    const [callRows, offlineRows] = await Promise.all([
      runQuery(callQuery),
      runQuery(offlineQuery)
    ]);
    
    const callData = callRows[0] || {};
    const offlineData = offlineRows[0] || {};
    
    const totalRowsChecked = (callData.total_calls || 0) + (offlineData.total_offline || 0);
    
    let score = 100;
    if (callData.null_lead_id > 0) score -= 10;
    if (callData.blank_agent > 100) score -= 5;
    if (callData.blank_status > 100) score -= 5;
    if (offlineData.null_spend > 0) score -= 10;
    
    res.json({
      success: true,
      data: {
        score: Math.max(0, score),
        totalRowsChecked,
        missingLeadIds: callData.null_lead_id || 0,
        blankAgents: callData.blank_agent || 0,
        blankStatuses: callData.blank_status || 0,
        zeroSecondCalls: callData.zero_second_calls || 0,
        missingCost: offlineData.null_spend || 0,
        unmappedBlc: true,
        lastRefreshed: new Date().toISOString()
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Serve Frontend
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
