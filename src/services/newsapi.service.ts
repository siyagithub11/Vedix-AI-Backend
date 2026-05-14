import axios from 'axios';

const NEWSAPI_URL = 'https://newsapi.org/v2/everything';

interface NewsAPIArticle {
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
}

export interface RawNewsArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  imageUrl?: string;
  publishedAt: Date;
}

export async function fetchFromNewsAPI(query: string, pageSize = 20): Promise<RawNewsArticle[]> {
  if (!process.env.NEWSAPI_KEY) return [];
  try {
    const res = await axios.get<{ articles: NewsAPIArticle[] }>(NEWSAPI_URL, {
      params: { q: query, language: 'en', pageSize, sortBy: 'publishedAt' },
      headers: { 'X-Api-Key': process.env.NEWSAPI_KEY },
      timeout: 8000,
    });
    return res.data.articles
      .filter((a) => a.title && a.url && !a.title.includes('[Removed]'))
      .map((a) => ({
        title:       a.title,
        summary:     a.description ?? a.title,
        sourceUrl:   a.url,
        source:      a.source.name,
        imageUrl:    a.urlToImage ?? undefined,
        publishedAt: new Date(a.publishedAt),
      }));
  } catch (err) {
    console.error('[NewsAPI] Fetch failed:', (err as Error).message);
    return [];
  }
}
