import cron from 'node-cron';
import axios from 'axios';
import Parser from 'rss-parser';
import prisma from '../lib/prisma';
import { generateWhyItMatters } from '../services/groq.service';
import { getUnsplashImage } from '../services/unsplash.service';

const rssParser = new Parser();

// ── Keyword matchers ────────────────────────────────────────────────────────
const AI_KEYWORDS = /\b(ai|artificial intelligence|gpt|claude|gemini|llm|llama|openai|anthropic|deepmind|machine learning|neural|transformer|diffusion|chatbot|copilot|mistral|hugging face|stability ai|midjourney)\b/i;

function classifyCategory(text: string): 'MODEL' | 'TOOLS' | 'RESEARCH' | 'BUSINESS' {
  const t = text.toLowerCase();
  if (/\b(model|gpt|claude|gemini|llama|mistral|weights|training|fine.?tun)\b/.test(t)) return 'MODEL';
  if (/\b(tool|app|launch|product|release|feature|api|sdk|plugin|update)\b/.test(t))    return 'TOOLS';
  if (/\b(paper|research|study|dataset|benchmark|arxiv|university|lab)\b/.test(t))      return 'RESEARCH';
  return 'BUSINESS';
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80) + '-' + Date.now();
}

function calcReadTime(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).length / 200));
}

// ── Fetch sources ───────────────────────────────────────────────────────────
async function fetchNewsAPI(): Promise<RawArticle[]> {
  if (!process.env.NEWSAPI_KEY) return [];
  try {
    const res = await axios.get('https://newsapi.org/v2/everything', {
      params: { q: 'artificial intelligence OR GPT OR LLM', language: 'en', pageSize: 20, sortBy: 'publishedAt' },
      headers: { 'X-Api-Key': process.env.NEWSAPI_KEY },
      timeout: 8000,
    });
    return (res.data.articles as NewsAPIArticle[]).map((a) => ({
      title:     a.title,
      summary:   a.description || a.title,
      sourceUrl: a.url,
      source:    a.source?.name || 'NewsAPI',
      imageUrl:  a.urlToImage || undefined,
      publishedAt: new Date(a.publishedAt),
    }));
  } catch {
    return [];
  }
}

async function fetchHNRSS(): Promise<RawArticle[]> {
  try {
    const feed = await rssParser.parseURL('https://hnrss.org/frontpage?q=AI+LLM+GPT&count=20');
    return feed.items.map((item) => ({
      title:     item.title ?? '',
      summary:   item.contentSnippet || item.title || '',
      sourceUrl: item.link ?? '',
      source:    'Hacker News',
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
    }));
  } catch {
    return [];
  }
}

async function fetchDevTo(): Promise<RawArticle[]> {
  try {
    const res = await axios.get('https://dev.to/api/articles', {
      params: { tag: 'ai', per_page: 15 },
      timeout: 8000,
    });
    return (res.data as DevToArticle[]).map((a) => ({
      title:     a.title,
      summary:   a.description || a.title,
      sourceUrl: `https://dev.to${a.path}`,
      source:    'Dev.to',
      imageUrl:  a.cover_image || undefined,
      publishedAt: new Date(a.published_at),
    }));
  } catch {
    return [];
  }
}

// ── Main cron job ───────────────────────────────────────────────────────────
export async function fetchAndIngestNews(): Promise<void> {
  console.log('[Cron] Starting news fetch...');
  const [newsAPI, hn, devTo] = await Promise.all([fetchNewsAPI(), fetchHNRSS(), fetchDevTo()]);

  const all = [...newsAPI, ...hn, ...devTo];
  const filtered = all.filter((a) => a.title && AI_KEYWORDS.test(a.title + ' ' + a.summary));

  let fetched = filtered.length, newCount = 0, skipped = 0;

  for (const article of filtered) {
    try {
      const exists = await prisma.news.findFirst({ where: { sourceUrl: article.sourceUrl } });
      if (exists) { skipped++; continue; }

      const category = classifyCategory(article.title + ' ' + article.summary);
      const imageUrl  = article.imageUrl ?? await getUnsplashImage(category.toLowerCase());
      const whyItMatters = await generateWhyItMatters(article.title, article.summary);

      await prisma.news.create({
        data: {
          slug:         slugify(article.title),
          title:        article.title.slice(0, 255),
          summary:      article.summary.slice(0, 1000),
          whyItMatters: whyItMatters.slice(0, 200),
          body:         article.summary,
          category,
          source:       article.source,
          sourceUrl:    article.sourceUrl,
          imageUrl:     imageUrl ?? null,
          publishedAt:  article.publishedAt,
          readTime:     calcReadTime(article.summary),
          isPublished:  true,
        },
      });
      newCount++;
    } catch {
      skipped++;
    }
  }

  console.log(`[Cron] Done — fetched: ${fetched}, new: ${newCount}, skipped: ${skipped}`);
}

export function startNewsCron(): void {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', fetchAndIngestNews);
  // Also run immediately on startup
  fetchAndIngestNews().catch(console.error);
  console.log('[Cron] News fetch cron started (every 6h)');
}

// ── Internal types ──────────────────────────────────────────────────────────
interface RawArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  imageUrl?: string;
  publishedAt: Date;
}
interface NewsAPIArticle {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  urlToImage: string | null;
  publishedAt: string;
}
interface DevToArticle {
  title: string;
  description: string;
  path: string;
  cover_image: string | null;
  published_at: string;
}
