import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// ── Start Cron ──────────────────────────
import { startNewsCron } from './cron/newsFetch';

// ── Routes ──────────────────────────────
import { newsRoutes } from './routes/news.routes';
import { blogRoutes } from './routes/blog.routes';
import { toolsRoutes } from './routes/tools.routes';
import { agentRoutes } from './routes/agent.routes';
import { adminRoutes } from './routes/admin.routes';
import { cronRoutes } from './routes/cron.routes';

import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

app.use('/api/news', newsRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cron', cronRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

app.use(errorHandler);

// ── START CRON ──────────────────────────
startNewsCron();

// ── START SERVER ────────────────────────
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

export default app;