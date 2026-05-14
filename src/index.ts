import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { newsRoutes } from './routes/news.routes';
import { blogRoutes } from './routes/blog.routes';
import { toolsRoutes } from './routes/tools.routes';
import { agentRoutes } from './routes/agent.routes';
import { adminRoutes } from './routes/admin.routes';
import { cronRoutes } from './routes/cron.routes';
import { errorHandler } from './middleware/errorHandler';
import { startNewsCron } from './cron/newsFetch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '2mb' }));

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/news',  newsRoutes);
app.use('/api/blog',  blogRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron',  cronRoutes);

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Vedix backend running on http://localhost:${PORT}`);
    startNewsCron();
  });
}

export default app;
