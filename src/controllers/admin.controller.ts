import { Request, Response, NextFunction } from 'express';
import { streamGroqCompletion, callGroqJson } from '../services/groq.service';

// POST /api/admin/ai/outline
export async function generateOutline(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { theme } = req.body as { theme: string };

    if (!theme?.trim()) {
      res.status(400).json({ success: false, error: 'theme is required', code: 'VALIDATION_ERROR' });
      return;
    }

    const prompt = `Generate a comprehensive blog outline for Vedix AI platform. Theme: "${theme}".
Return ONLY valid JSON with this exact structure:
{
  "title": "string",
  "excerpt": "string (2 sentences max)",
  "sections": [
    { "heading": "string", "points": ["string", "string", "string"] }
  ],
  "toolSuggestions": ["tool name 1", "tool name 2", "tool name 3"],
  "faq": [
    { "q": "string", "a": "string" }
  ]
}
Include 4-6 sections and 3-5 FAQ items. Focus on practical, actionable content.`;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    await streamGroqCompletion(
      [
        { role: 'system', content: 'You are a professional content strategist for Vedix AI. Return only valid JSON, no markdown.' },
        { role: 'user', content: prompt },
      ],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
      }
    );

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    next(err);
  }
}
