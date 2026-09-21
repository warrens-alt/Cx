import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { createReportingRouter } from './server/reporting/router';
import { pathToFileURL } from 'node:url';
import { analyticsRouter } from './server/api';
import { authenticate } from './server/security';
import { RequestError, boundedInteger } from './server/bigquery/filters';
import { analyticalConcurrency, apiAuditLog, requestContext, sameOriginRequests, securityHeaders } from './server/httpGuards';

export async function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext());
  app.use(securityHeaders());
  app.use(compression());
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    next();
  }, apiAuditLog, authenticate(), sameOriginRequests());
  const concurrency = analyticalConcurrency();
  app.use('/api/reporting', concurrency, createReportingRouter());
  app.use('/api/analytics', concurrency, (_req, res, next) => { res.setHeader('X-Analytics-Status', 'LEGACY_UNVERIFIED'); next(); }, analyticsRouter);
  // Arbitrary project/table browsing is intentionally unavailable. Use configured, authorised exports.
  app.use('/api/bq', (_req, res) => res.status(410).json({ success: false, error: 'Unrestricted warehouse browsing has been retired. Use the configured analytics and export endpoints.' }));
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Unknown API endpoint' }));
  if (process.env.NODE_ENV === 'production') {
    const clientDirectory = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(clientDirectory, { dotfiles: 'deny' }));
    app.get(/.*/, (req, res) => {
      if (path.extname(req.path) || req.path.split('/').some(p => p.startsWith('.'))) return res.status(404).end();
      return res.sendFile(path.join(clientDirectory, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.use((error: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return res.end();
    const status = error instanceof RequestError ? error.status : (error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error(JSON.stringify({ action: 'REQUEST_FAILED', requestId: res.locals.requestId, method: req.method, status, error: error?.name || 'Error' }));
    res.status(status).json({ success: false, error: error instanceof RequestError ? error.message : status === 400 ? 'Invalid JSON request body' : status === 413 ? 'Request body is too large' : 'The request failed. Check the server logs or retry.', requestId: res.locals.requestId });
  });
  return app;
}
const port = boundedInteger(process.env.PORT, 3000, 65535, 1);
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) createApp().then(app => {
  const server = app.listen(port, '0.0.0.0');
  server.once('listening', () => console.log(`ConversionX listening on ${port}`));
  server.once('error', error => { console.error('Server startup failed:', error.message); process.exitCode = 1; });
}).catch(error => { console.error('Server startup failed:', error.message); process.exitCode = 1; });
