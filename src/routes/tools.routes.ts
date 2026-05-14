import { Router } from 'express';
import { getTools, getToolItem } from '../controllers/tools.controller';

export const toolsRoutes = Router();

toolsRoutes.get('/',      getTools);
toolsRoutes.get('/:slug', getToolItem);
