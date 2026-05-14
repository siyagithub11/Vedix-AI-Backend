import axios from 'axios';

const UNSPLASH_URL = 'https://api.unsplash.com/photos/random';

const CATEGORY_QUERIES: Record<string, string> = {
  MODEL:    'artificial intelligence neural network',
  TOOLS:    'technology software productivity',
  RESEARCH: 'science laboratory data',
  BUSINESS: 'business technology office',
};

export async function getUnsplashImage(category: string): Promise<string | null> {
  if (!process.env.UNSPLASH_KEY) return null;
  try {
    const query = CATEGORY_QUERIES[category.toUpperCase()] ?? 'artificial intelligence technology';
    const res = await axios.get(UNSPLASH_URL, {
      params: { query, orientation: 'landscape', content_filter: 'high' },
      headers: { Authorization: `Client-ID ${process.env.UNSPLASH_KEY}` },
      timeout: 5000,
    });
    return (res.data as { urls: { regular: string } }).urls.regular ?? null;
  } catch {
    return null;
  }
}
