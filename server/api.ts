import { exportData } from './bigquery/export';

import { Router } from "express";
import { 
  getOverviewStats, 
  getFunnelStats, 
  getDataHealthStats, 
  getLeads, getLeadTimeline, getHlcVendorCoverage,
  getCallPerformanceStats,
  getSourcesStats,
  getQualityStats,
  getSpeedToLeadStats,
  getCohortStats,
  getTimeseriesStats,
  getFilterOptions,
  getAcquisitionStats,
  getOutcomesStats,
  getRoutingIntelligenceStats,
  getConsumerReentryStats,
  getOutcomeQualityStats,
  getRevettingStats,
  getDataTrustStats,
  getMultiVendorStats,
  getReconciliationValidation
} from './bigquery/queries';
import { executeDynamicQuery, generateDriverInsights } from './bigquery/semantic_engine';
import { checkBigQueryHealth } from './bigquery/client';
import { getClientConfig, getAllClients, validateEnvironment } from './bigquery/config';
import { discoverData } from './bigquery/discovery';
import { CANONICAL_PARAMETERS } from './bigquery/registry';
import { GoogleGenAI } from '@google/genai';
import { cacheResponse } from './cacheMiddleware';

export const analyticsRouter = Router();

analyticsRouter.get('/clients', (req, res) => {
  try {
    const clients = getAllClients().map(c => ({
      id: c.id,
      name: c.name,
      currency: c.currency,
      timezone: c.timezone,
      capabilities: c.capabilities
    }));
    res.json({ success: true, data: clients });
  } catch(error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/discovery', async (req, res) => {
  try {
    const clientId = (req.query.clientId as string) || 'default';
    const client = getClientConfig(clientId);
    const data = await discoverData(client);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

validateEnvironment();


function getStandardParams(req: any) {
  const clientId = req.query.clientId || req.body?.clientId || 'default';
  const startDate = req.query.startDate || req.body?.startDate || req.body?.dateRange?.start;
  const endDate = req.query.endDate || req.body?.endDate || req.body?.dateRange?.end;
  const filters = req.query.filters || req.body?.filters;
  let parsedFilters: any = {};
  if (filters) {
    try { 
      parsedFilters = typeof filters === 'string' ? JSON.parse(filters) : filters; 
    } catch(e) {}
  }
  // also map old source/medium if present as fallback
  const source = req.query.source || req.body?.source;
  const vendor = req.query.vendor || req.body?.vendor;
  const medium = req.query.medium || req.body?.medium;
  if (source && !parsedFilters.source) parsedFilters.source = { operator: 'in', values: typeof source === 'string' ? source.split(',') : source };
  if (vendor && !parsedFilters.vendor) parsedFilters.vendor = { operator: 'in', values: typeof vendor === 'string' ? vendor.split(',') : vendor };
  if (medium && !parsedFilters.medium) parsedFilters.medium = { operator: 'in', values: typeof medium === 'string' ? medium.split(',') : medium };

  return { clientId, startDate, endDate, filters: parsedFilters };
}

function buildResponse(req: any, data: any, viewName: string) {
  const clientId = req.query.clientId || 'default';
  const client = getClientConfig(clientId as string);
  return {
    success: true,
    metadata: {
      clientId,
      clientName: client.name,
      dataAsOf: new Date().toISOString(),
      source: {
        type: 'bigquery',
        project: client.bigQueryProject,
        dataset: client.bigQueryDatasets[0],
        analyticsView: viewName
      }
    },
    data
  };
}



analyticsRouter.get('/export', async (req, res) => {
  try {
    const params: any = {
      clientId: req.query.clientId || 'default',
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      filters: req.query.filters ? JSON.parse(req.query.filters as string) : undefined,
      grain: req.query.grain || 'lead',
      format: req.query.format || 'csv',
      metrics: req.query.metrics ? (req.query.metrics as string).split(',') : undefined,
      segment: req.query.segment,
      chartBucket: req.query.chartBucket
    };
    
    // Add extra params from query to filters if they exist (for drilling down into charts)
    if (params.segment && params.chartBucket) {
       if(!params.filters) params.filters = {};
       params.filters[params.segment] = { operator: 'in', values: [params.chartBucket] };
    }
    
    const result = await exportData(params);
    
    // Audit Logging
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: 'DATA_EXPORT',
      client: params.clientId,
      grain: params.grain,
      format: params.format,
      filters: params.filters
    }));
    
    if (params.format === 'json') {
      res.json({ success: true, data: result });
    } else {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${params.clientId}_${params.grain}_export_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(result);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/health', async (req, res) => {
  try {
    const clientId = (req.query.clientId as string) || 'default';
    const client = getClientConfig(clientId);
    const health = await checkBigQueryHealth(client.bigQueryProject, client.bigQueryDatasets[0], client.semanticMappings.tables.leads.split('.').pop());
    res.json({ success: true, health, client: client.name });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.post('/explain', async (req, res) => {
  try {
    const { metrics, viewName } = req.body;
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
    }
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const prompt = `
      You are an expert Revenue Operations Analyst.
      Analyse the following aggregated metrics from the ${viewName} dashboard.
      Provide a concise executive summary of the performance.
      
      CRITICAL RULES:
      1. Differentiate FACT (what happened), OBSERVATION (where it happened), and HYPOTHESIS (why it might have happened).
      2. Label any hypothesis explicitly (e.g., "Hypothesis: This may indicate...").
      3. Do not invent any metrics or data not provided.
      4. Keep it under 150 words.
      5. Use professional, enterprise tone.
      
      DATA:
      ${JSON.stringify(metrics, null, 2)}
    `;
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    res.json({ success: true, explanation: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



analyticsRouter.get('/filter-options', cacheResponse(300), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const options = await getFilterOptions(params);
    res.json(buildResponse(req, options, 'vw_lead_lifecycle'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/overview', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getOverviewStats(params);
    res.json(buildResponse(req, stats, 'vw_daily_kpis'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/funnel', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getFunnelStats(params);
    res.json(buildResponse(req, stats, 'vw_conversion_funnel'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/data-quality', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getDataHealthStats(params);
    res.json(buildResponse(req, stats, 'vw_data_quality'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get(['/calls', '/call-performance'], cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getCallPerformanceStats(params);
    res.json(buildResponse(req, stats, 'vw_call_performance'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/sources', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getSourcesStats(params);
    res.json(buildResponse(req, stats, 'vw_source_performance'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/quality', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getQualityStats(params);
    res.json(buildResponse(req, stats, 'vw_grade_performance'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/speed-to-lead', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getSpeedToLeadStats(params);
    res.json(buildResponse(req, stats, 'vw_speed_to_lead'));
  } catch (error: any) {
    console.error("SPEED TO LEAD ERROR:", error.message);
    // We want the query!
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/cohorts', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getCohortStats({
      ...params,
      cohortType: req.query.cohortType as string,
      metricType: req.query.metricType as string
    });
    res.json(buildResponse(req, stats, 'vw_cohort_performance'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/timeseries', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getTimeseriesStats(params);
    res.json(buildResponse(req, stats, 'vw_marketing_daily'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


analyticsRouter.get('/acquisition', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getAcquisitionStats(params);
    res.json(buildResponse(req, stats, 'vw_marketing_daily'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/outcomes', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getOutcomesStats(params);
    res.json(buildResponse(req, stats, 'vw_lead_lifecycle'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/parameter-coverage', cacheResponse(300), async (req, res) => {
  try {
    const totalRequired = 52;
    const mapped = CANONICAL_PARAMETERS.filter(p => p.status === 'MAPPED').length;
    const populated = mapped; 
    const unavailable = totalRequired - mapped;
    
    res.json({
      success: true,
      data: {
        summary: {
          totalRequired,
          mapped,
          populated,
          unavailable,
          sourceConflicts: 2, 
          coveragePercent: ((mapped / totalRequired) * 100).toFixed(1)
        },
        parameters: CANONICAL_PARAMETERS
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/leads', cacheResponse(60), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const { limit = 100, offset = 0 } = req.query as any;
    const leads = await getLeads({ ...params, limit: parseInt(limit, 10), offset: parseInt(offset, 10) });
    res.json(buildResponse(req, leads, 'vw_lead_lifecycle'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/lead-timeline/:leadId', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const timeline = await getLeadTimeline({ ...params, leadId: req.params.leadId });
    res.json(buildResponse(req, timeline, 'vw_lead_vendor_transactions'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/routing', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getRoutingIntelligenceStats(params);
    res.json(buildResponse(req, stats, 'vw_ror_events'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/consumers', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getConsumerReentryStats(params);
    res.json(buildResponse(req, stats, 'vw_consumers'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/outcomes-quality', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getOutcomeQualityStats(params);
    res.json(buildResponse(req, stats, 'vw_commercial_events'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/revetting', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getRevettingStats(params);
    res.json(buildResponse(req, stats, 'vw_leads'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/data-trust', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getDataTrustStats(params);
    res.json(buildResponse(req, stats, 'vw_lead_vendor_transactions'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get('/multi-vendor', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getMultiVendorStats(params);
    res.json(buildResponse(req, stats, 'vw_leads'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

analyticsRouter.get(['/vendor-coverage', '/hlc-coverage'], cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const stats = await getHlcVendorCoverage(params);
    res.json(buildResponse(req, stats, 'vw_lead_vendor_transactions'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Automated Analytics Reconciliation Screen (Raw BQ vs Semantic Layer vs API vs UI)
analyticsRouter.get('/validation', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const validation = await getReconciliationValidation(params);
    res.json(buildResponse(req, validation, 'vw_leads'));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Driver Decomposition & "Why Did This Change?"
analyticsRouter.all(['/insights', '/drivers'], cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const metric = (req.query.metric as string) || (req.body?.metric as string) || 'activations';
    const dimension = (req.query.dimension as string) || (req.body?.dimension as string) || 'source';
    const insights = await generateDriverInsights({
      clientId: params.clientId,
      metric,
      dimension,
      startDate: params.startDate,
      endDate: params.endDate,
      filters: params.filters
    });
    const client = getClientConfig(params.clientId);
    res.json({
      success: true,
      data: insights.data,
      metadata: {
        clientId: params.clientId,
        clientName: client.name,
        currency: client.currency,
        dataAsOf: new Date().toISOString(),
        metric: insights.metric,
        dimension: insights.dimension,
        daysCompared: insights.daysCompared,
        source: {
          type: 'bigquery',
          project: client.bigQueryProject,
          dataset: client.bigQueryDatasets[0],
          analyticsView: 'vw_leads'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dynamic Query Exploration & Pivots
analyticsRouter.all('/explore', cacheResponse(120), async (req, res) => {
  try {
    const params = getStandardParams(req);
    const metric = (req.query.metric as string) || (req.body?.metric as string) || 'leads';
    const dimension = (req.query.dimension as string) || (req.body?.dimension as string) || 'source';
    const secondaryDimension = (req.query.secondaryDimension as string) || (req.body?.secondaryDimension as string) || undefined;
    const result = await executeDynamicQuery({
      clientId: params.clientId,
      metric,
      dimension,
      secondaryDimension,
      startDate: params.startDate,
      endDate: params.endDate,
      filters: params.filters || {}
    });
    const client = getClientConfig(params.clientId);
    res.json({
      success: true,
      data: result.data,
      metadata: {
        clientId: params.clientId,
        clientName: client.name,
        currency: client.currency,
        dataAsOf: new Date().toISOString(),
        durationMs: result.metadata.durationMs,
        bytesBilled: result.metadata.bytesBilled,
        metric: result.metadata.metric,
        dimension: result.metadata.dimension,
        secondaryDimension: result.metadata.secondaryDimension,
        source: {
          type: 'bigquery',
          project: client.bigQueryProject,
          dataset: client.bigQueryDatasets[0],
          analyticsView: 'vw_leads'
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

['campaigns', 'grades'].forEach(route => {
  analyticsRouter.get(`/${route}`, (req, res) => {
    res.status(501).json({ success: false, error: 'Endpoint scaffolded, query logic pending' });
  });
});
