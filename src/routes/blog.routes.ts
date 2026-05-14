import { Router } from 'express';
import { getBlogFeed, getBlogPost } from '../controllers/blog.controller';

export const blogRoutes = Router();

blogRoutes.get('/',      getBlogFeed);
blogRoutes.get('/:slug', getBlogPost);
