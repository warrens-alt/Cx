import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { analyticsRouter } from './server/api';
import { authenticate } from './server/security';
import { RequestError, boundedInteger } from './server/bigquery/filters';

export async function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  }, authenticate());
  app.use('/api/analytics', analyticsRouter);
  // Arbitrary project/table browsing is intentionally unavailable. Use configured, authorised exports.
  app.use('/api/bq', (_req, res) => res.status(410).json({ success: false, error: 'Unrestricted warehouse browsing has been retired. Use the configured analytics and export endpoints.' }));
  app.use('/api', (_req, res) => res.status(404).json({ success: false, error: 'Unknown API endpoint' }));
  if (process.env.NODE_ENV === 'production') {
    const clientDirectory = path.join(process.cwd(), 'dist', 'client');
    app.use(express.static(clientDirectory, { dotfiles: 'deny' }));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDirectory, 'index.html')));
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }
  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) return res.end();
    const status = error instanceof RequestError ? error.status : (error?.type === 'entity.too.large' ? 413 : error?.type === 'entity.parse.failed' ? 400 : 500);
    if (status >= 500) console.error('Request failed:', error?.name || 'Error');
    res.status(status).json({ success: false, error: error instanceof RequestError ? error.message : status === 400 ? 'Invalid JSON request body' : status === 413 ? 'Request body is too large' : 'The request failed. Check the server logs or retry.' });
  });
  return app;
}
const port = boundedInteger(process.env.PORT, 3000, 65535, 1);
createApp().then(app => app.listen(port, '0.0.0.0', () => console.log(`ConversionX listening on ${port}`))).catch(error => {
  console.error('Server startup failed:', error.message); process.exitCode = 1;
});
