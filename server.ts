import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import compression from 'compression';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { analyticsRouter } from './server/api';
import { authenticate, requireAdmin } from './server/security';
import { getAllClients, validateEnvironment } from './server/bigquery/config';
import { RequestError, boundedInteger, scalarString } from './server/bigquery/filters';

export async function createApp() {
  validateEnvironment();
  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('X-Request-ID', res.locals.requestId);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
  app.use('/api', authenticate());
  const requests = new Map<string, { count: number; until: number }>();
  app.use('/api', (req, res, next) => {
    const now = Date.now(), key = res.locals.principal.subject;
    for (const [id, entry] of requests) if (entry.until <= now) requests.delete(id);
    const window = requests.get(key) || { count: 0, until: now + 60000 };
    requests.set(key, window);
    if (++window.count > 120) { res.setHeader('Retry-After', '60'); return next(new RequestError('Request limit exceeded', 429)); }
    // No wildcard CORS; protect POST endpoints against cross-site browser requests.
    const origin = req.get('origin');
    if (origin) {
      try {
        const allowed = process.env.APP_ORIGIN || `https://${req.get('host')}`;
        if (new URL(origin).origin !== new URL(allowed).origin) throw new Error();
      } catch { return next(new RequestError('Origin is not allowed', 403)); }
    }
    next();
  });
  app.use('/api', express.json({ limit: '32kb', strict: true }));
  app.use('/api/analytics', analyticsRouter);
  // Discovery is limited to explicitly configured, authorised tenants. Arbitrary project/table queries are removed.
  app.use('/api/bq', requireAdmin);
  app.get('/api/bq/projects', (req, res) => {
    const tenants = getAllClients().filter(c => res.locals.principal.tenants.includes(c.id));
    res.json({ success: true, data: [...new Set(tenants.map(t => t.bigQueryProject))].map(id => ({ id, name: id })) });
  });
  app.get('/api/bq/datasets', (req, res, next) => {
    try {
      const project = scalarString(req.query.projectId, 'projectId');
      const allowed = getAllClients().filter(c => res.locals.principal.tenants.includes(c.id) && c.bigQueryProject === project);
      if (!allowed.length) throw new RequestError('Project access denied', 403);
      res.json({ success: true, data: [...new Set(allowed.flatMap(c => c.bigQueryDatasets))].map(id => ({ id })) });
    } catch (error) { next(error); }
  });
  app.get('/api/bq/tables', (req, res, next) => {
    try {
      const project = scalarString(req.query.projectId, 'projectId'), dataset = scalarString(req.query.datasetId, 'datasetId');
      const tables = getAllClients().filter(c => res.locals.principal.tenants.includes(c.id)).flatMap(c => Object.values(c.semanticMappings.tables))
        .filter((t): t is string => typeof t === 'string' && t.startsWith(`${project}.${dataset}.`));
      if (!tables.length) throw new RequestError('Dataset access denied', 403);
      res.json({ success: true, data: [...new Set(tables)].map(t => ({ id: t.split('.')[2] })) });
    } catch (error) { next(error); }
  });
  app.use('/api/bq', (_req, _res, next) => next(new RequestError('Unrestricted BigQuery endpoints have been retired. Use the authenticated analytical API or redacted export.', 410)));
  app.use('/api', (_req, _res, next) => next(new RequestError('API endpoint not found', 404)));
  if (process.env.NODE_ENV === 'production') {
    const clientPath = path.resolve(process.cwd(), 'dist/client');
    app.use(express.static(clientPath, { dotfiles: 'deny', index: false }));
    app.get('*', (req, res, next) => {
      if (path.extname(req.path) || req.path.split('/').some(segment => segment.startsWith('.'))) return next(new RequestError('Asset not found', 404));
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = error instanceof RequestError ? error.status : error?.type === 'entity.too.large' ? 413 : error?.name === 'SyntaxError' && error?.status === 400 ? 400 : 500;
    console.error(JSON.stringify({ event: 'REQUEST_FAILED', requestId: res.locals.requestId, status, code: typeof error?.code === 'string' ? error.code : undefined }));
    if (res.headersSent) return res.end();
    res.status(status).json({ success: false, error: error instanceof RequestError ? error.message : status === 400 ? 'Invalid JSON request body' : status === 413 ? 'Request body is too large' : 'The request failed. Use the request ID when investigating.', requestId: res.locals.requestId });
  });
  return app;
}
export async function startServer() {
  const app = await createApp(), port = boundedInteger(process.env.PORT, 3000, 65535, 1);
  const server = app.listen(port, process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1', () => console.info(`Server listening on ${port}`));
  process.once('SIGTERM', () => server.close());
  return server;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) startServer().catch(() => { console.error('Server failed to start'); process.exitCode = 1; });
