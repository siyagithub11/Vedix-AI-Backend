import { Router } from 'express';
import { agentChat } from '../controllers/agent.controller';

export const agentRoutes = Router();

agentRoutes.post('/', agentChat);
agentRoutes.post('/chat', agentChat);
