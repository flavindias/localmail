import express, { Request, Response } from 'express';
import path from 'path';
import { store } from '../storage/store';

export function startApiServer(port: number): void {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../../public')));

  // SSE endpoint
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const handler = (id: string) => {
      res.write(`data: ${JSON.stringify({ type: 'email:added', id })}\n\n`);
    };

    store.on('email:added', handler);
    const keepAlive = setInterval(() => res.write(':ping\n\n'), 30000);

    req.on('close', () => {
      store.off('email:added', handler);
      clearInterval(keepAlive);
    });
  });

  // List messages (summaries)
  app.get('/api/messages', (_req: Request, res: Response) => {
    res.json(store.getAll());
  });

  // Get single message
  app.get('/api/messages/:id', (req: Request, res: Response) => {
    const email = store.getById(req.params.id);
    if (!email) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(email);
  });

  // Get HTML body
  app.get('/api/messages/:id/html', (req: Request, res: Response) => {
    const email = store.getById(req.params.id);
    if (!email) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(email.html ?? `<pre>${email.text ?? ''}</pre>`);
  });

  // Get raw source
  app.get('/api/messages/:id/source', (req: Request, res: Response) => {
    const email = store.getById(req.params.id);
    if (!email) {
      res.status(404).send('Not found');
      return;
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(email.raw);
  });

  // Delete single message
  app.delete('/api/messages/:id', (req: Request, res: Response) => {
    const deleted = store.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(204).send();
  });

  // Delete all messages
  app.delete('/api/messages', (_req: Request, res: Response) => {
    store.deleteAll();
    res.status(204).send();
  });

  const httpServer = app.listen(port, () => {
    console.log(`[API] Listening on port ${port}`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[API] Port ${port} is already in use. Set API_PORT env var to use a different port.`);
    } else {
      console.error('[API] Server error:', err);
    }
    process.exit(1);
  });
}
