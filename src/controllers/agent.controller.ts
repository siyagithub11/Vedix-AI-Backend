import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { streamGroqCompletion } from '../services/groq.service';
import { AgentMessage } from '../types/shared';

// POST /api/agent
export async function agentChat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { message, history = [], context } = req.body as {
      message: string;
      history: AgentMessage[];
      context?: Record<string, unknown>;
    };

    // Build context string
    const contextStr = context ? `User context: ${JSON.stringify(context)}. ` : '';

    const systemPrompt = `You are Vedix AI, an expert assistant for the Vedix AI discovery platform. ${contextStr}Your job is to help users find the right AI tools, understand AI news, and learn how to use AI effectively. Be concise (under 150 words per response). When recommending tools, suggest real AI tools by name (e.g. ChatGPT, Midjourney, GitHub Copilot, Claude, Perplexity). Always be helpful and specific.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';

    await streamGroqCompletion(messages, (chunk) => {
      fullResponse += chunk;
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`);
    });

    res.write('data: [DONE]\n\n');
    res.end();

    // Log async
    prisma.agentLog.create({
      data: { query: message, response: fullResponse, context: context as any },
    }).catch(() => {});
  } catch (err) {
    next(err);
  }
}
