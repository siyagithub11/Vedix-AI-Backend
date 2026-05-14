import { Router } from 'express';
import { getNews, getNewsItem } from '../controllers/news.controller';

export const newsRoutes = Router();

newsRoutes.get('/',      getNews);
newsRoutes.get('/:slug', getNewsItem);
