import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

type Message = { role: 'system' | 'user' | 'assistant'; content: string };

// Streaming completion — calls onChunk for each token
export async function streamGroqCompletion(
  messages: Message[],
  onChunk: (token: string) => void
): Promise<string> {
  const stream = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    stream: true,
    max_tokens: 512,
    temperature: 0.7,
  });

  let full = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) {
      full += token;
      onChunk(token);
    }
  }
  return full;
}

// Non-streaming — returns full response text
export async function callGroq(messages: Message[], maxTokens = 256): Promise<string> {
  const res = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages,
    stream: false,
    max_tokens: maxTokens,
    temperature: 0.5,
  });
  return res.choices[0]?.message?.content ?? '';
}

// Returns parsed JSON from Groq
export async function callGroqJson<T>(messages: Message[]): Promise<T> {
  const text = await callGroq(messages, 1024);
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Groq did not return valid JSON');
  return JSON.parse(match[0]) as T;
}

// Generate a single "Why it matters" sentence (max 20 words)
export async function generateWhyItMatters(title: string, summary: string): Promise<string> {
  return callGroq([
    { role: 'system', content: 'You write one-sentence "why this matters" explanations for AI news. Maximum 20 words. No quotes.' },
    { role: 'user', content: `Title: ${title}\nSummary: ${summary}\n\nWhy it matters (1 sentence, max 20 words):` },
  ], 60);
}
