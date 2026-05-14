import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createNews, updateNews } from '../controllers/news.controller';
import { createBlogPost, updateBlogPost } from '../controllers/blog.controller';
import { createTool } from '../controllers/tools.controller';
import { generateOutline } from '../controllers/admin.controller';

export const adminRoutes = Router();

// All admin routes require auth
adminRoutes.use(requireAuth);

// ── News ───────────────────────────────────────────────────────────────────
adminRoutes.post('/news',     createNews);
adminRoutes.put('/news/:id',  updateNews);

// ── Blog ───────────────────────────────────────────────────────────────────
adminRoutes.post('/blog',     createBlogPost);
adminRoutes.put('/blog/:id',  updateBlogPost);

// ── Tools ──────────────────────────────────────────────────────────────────
adminRoutes.post('/tools',    createTool);

// ── AI ─────────────────────────────────────────────────────────────────────
adminRoutes.post('/ai/outline', generateOutline);
