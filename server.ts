import express from 'express';
import compression from 'compression';
import { BigQuery } from '@google-cloud/bigquery';
import { GoogleAuth } from 'google-auth-library';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { analyticsRouter } from './server/api';

async function startServer() {
  const app = express();
  app.use(compression());
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  
  app.use('/api/analytics', analyticsRouter);

  app.get('/api/bq/projects', async (req, res) => {
    try {
      const credentials = JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}');
      const auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/bigquery']
      });
      const client = await auth.getClient();
      const response = await client.request({
        url: 'https://bigquery.googleapis.com/bigquery/v2/projects'
      });
      const projects = (response.data as any).projects || [];
      return res.json({ 
        success: true, 
        data: projects.map((p: any) => ({ 
          id: p.projectReference.projectId, 
          name: p.friendlyName || p.projectReference.projectId 
        })) 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/datasets', async (req, res) => {
    try {
      const { projectId } = req.query as { projectId: string };
      if (!projectId) {
        return res.status(400).json({ error: 'Missing projectId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const [datasets] = await bq.getDatasets();
      
      res.json({ success: true, data: datasets.map(d => ({ id: d.id })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/tables', async (req, res) => {
    try {
      const { projectId, datasetId } = req.query as { projectId: string, datasetId: string };
      if (!projectId || !datasetId) {
        return res.status(400).json({ error: 'Missing projectId or datasetId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const dataset = bq.dataset(datasetId);
      const [tables] = await dataset.getTables();
      
      res.json({ success: true, data: tables.map(t => ({ id: t.id })) });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/preview', async (req, res) => {
    try {
      const { projectId, datasetId, tableId, source, medium, startMonth, endMonth, limit } = req.query as { 
        projectId: string, datasetId: string, tableId: string,
        source?: string, medium?: string, startMonth?: string, endMonth?: string, limit?: string 
      };
      if (!projectId || !datasetId || !tableId) {
        return res.status(400).json({ error: 'Missing projectId, datasetId, or tableId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      
      // Get table schema to only apply filters if columns exist
      const [metadata] = await bq.dataset(datasetId).table(tableId).getMetadata();
      const schemaFields = metadata.schema?.fields || [];
      const columnNames = schemaFields.map((f: any) => f.name);

      let whereClauses = [];
      if (source && columnNames.includes('offershop_source')) {
         const sources = source.split(',').map(s => `'${s.trim()}'`).join(',');
         whereClauses.push(`offershop_source IN (${sources})`);
      }
      if (medium && columnNames.includes('offernet_medium')) {
         const mediums = medium.split(',').map(s => `'${s.trim()}'`).join(',');
         whereClauses.push(`offernet_medium IN (${mediums})`);
      }
      if (startMonth && columnNames.includes('fetched')) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 7) >= '${startMonth}'`);
      }
      if (endMonth && columnNames.includes('fetched')) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 7) <= '${endMonth}'`);
      }
      const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const limitString = limit ? `LIMIT ${parseInt(limit, 10)}` : '';

      const query = `SELECT * FROM \`${projectId}.${datasetId}.${tableId}\` ${whereString} ${limitString}`;
      
      res.setHeader('Content-Type', 'application/json');
      res.write('{"success":true,"data":[');
      
      let isFirst = true;
      const stream = bq.createQueryStream({ query });
      
      stream.on('error', (err) => {
        console.error('BigQuery stream error:', err);
        if (isFirst) {
          res.write(JSON.stringify({ _error: err.message }));
        } else {
          res.write(',' + JSON.stringify({ _error: err.message }));
        }
        res.end(']}');
      })
      .on('data', (row) => {
        if (!isFirst) {
          res.write(',');
        }
        isFirst = false;
        res.write(JSON.stringify(row));
      })
      .on('end', () => {
        res.write(']}');
        res.end();
      });
    } catch (error: any) {
      if (!res.headersSent) {
        res.status(500).json({ error: error.message });
      } else {
        res.end();
      }
    }
  });

  app.get('/api/bq/filter-options', async (req, res) => {
    try {
      const { projectId, datasetId, tableId } = req.query as { projectId: string, datasetId: string, tableId: string };
      if (!projectId || !datasetId || !tableId) {
        return res.status(400).json({ error: 'Missing projectId, datasetId, or tableId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      const query = `
        SELECT 
          DISTINCT offershop_source, offernet_medium
        FROM \`${projectId}.${datasetId}.${tableId}\`
        WHERE offershop_source IS NOT NULL OR offernet_medium IS NOT NULL
      `;
      const [rows] = await bq.query({ query });
      
      const sources = new Set<string>();
      const mediums = new Set<string>();
      
      rows.forEach(r => {
        if (r.offershop_source) sources.add(r.offershop_source);
        if (r.offernet_medium) mediums.add(r.offernet_medium);
      });
      
      res.json({ 
        success: true, 
        data: {
          sources: Array.from(sources).filter(Boolean).sort(),
          mediums: Array.from(mediums).filter(Boolean).sort()
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/bq/journey-metrics', async (req, res) => {
    try {
      const { projectId, datasetId, tableId, source, medium, startMonth, endMonth, startDate, endDate } = req.query as { 
        projectId: string, datasetId: string, tableId: string, 
        source?: string, medium?: string, startMonth?: string, endMonth?: string,
        startDate?: string, endDate?: string
      };
      if (!projectId || !datasetId || !tableId) {
        return res.status(400).json({ error: 'Missing projectId, datasetId, or tableId' });
      }
      
      const bq = new BigQuery({ projectId, credentials: JSON.parse(process.env.BIGQUERY_CREDENTIALS || '{}') });
      
      let whereClauses = [];
      if (source) {
         const sources = source.split(',').map(s => `'${s.trim()}'`).join(',');
         whereClauses.push(`offershop_source IN (${sources})`);
      }
      if (medium) {
         const mediums = medium.split(',').map(s => `'${s.trim()}'`).join(',');
         whereClauses.push(`offernet_medium IN (${mediums})`);
      }
      if (startDate) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 10) >= '${startDate}'`);
      } else if (startMonth) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 7) >= '${startMonth}'`);
      }
      if (endDate) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 10) <= '${endDate}'`);
      } else if (endMonth) {
         whereClauses.push(`SUBSTR(CAST(fetched AS STRING), 1, 7) <= '${endMonth}'`);
      }
      const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const query = `
        SELECT
          SUBSTR(CAST(fetched AS STRING), 1, 7) as month,
          COUNT(IF(CAST(fetched AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND fetched IS NOT NULL, 1, NULL)) as fetched,
          COUNTIF((CAST(standardised_idno AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND standardised_idno IS NOT NULL) OR (CAST(standardised_mobile AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND standardised_mobile IS NOT NULL)) as standardised,
          COUNTIF(CAST(validate_mobile AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND validate_mobile IS NOT NULL) as phoneValidated,
          COUNTIF(CAST(validate_idno AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND validate_idno IS NOT NULL) as idValidated,
          COUNTIF(CAST(fetched AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND fetched IS NOT NULL) as deduped,
          COUNTIF(CAST(offershop_color_vetting_date AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND offershop_color_vetting_date IS NOT NULL) as scored,
          COUNTIF(CAST(offershop_color_vetting_date AS STRING) NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND offershop_color_vetting_date IS NOT NULL) as contactability,
          COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.attempted_to_deliver NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.attempted_to_deliver IS NOT NULL) > 0) as attemptedDeliver,
          COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.delivered NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.delivered IS NOT NULL) > 0) as delivered,
          COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.delivered NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.delivered IS NOT NULL) > 0) as vendorRecords,
          COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.sale NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.sale IS NOT NULL) > 0) as sale,
          COUNTIF((SELECT COUNT(1) FROM UNNEST(hlc_details) h WHERE h.activated NOT IN ('1900-01-01 00:00:00', '1970-01-01 00:00:00', '1970-01-01 00:00:01') AND h.activated IS NOT NULL) > 0) as activation
        FROM \`${projectId}.${datasetId}.${tableId}\`
        ${whereString}
        GROUP BY month
        ORDER BY month ASC
      `;
      const [rows] = await bq.query({ query });
      res.json({ success: true, data: rows });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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

  const port = 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer();
