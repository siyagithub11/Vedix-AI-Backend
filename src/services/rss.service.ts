import Parser from 'rss-parser';

const parser = new Parser();

export interface RssArticle {
  title: string;
  summary: string;
  sourceUrl: string;
  source: string;
  publishedAt: Date;
}

const RSS_FEEDS = [
  { url: 'https://hnrss.org/frontpage?q=AI+LLM+GPT&count=20', source: 'Hacker News' },
  { url: 'https://feeds.feedburner.com/venturebeat/SZYF', source: 'VentureBeat AI' },
  { url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', source: 'The Verge AI' },
];

export async function fetchFromRSS(): Promise<RssArticle[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async ({ url, source }) => {
      const feed = await parser.parseURL(url);
      return feed.items.map((item): RssArticle => ({
        title:       item.title ?? '',
        summary:     item.contentSnippet ?? item.title ?? '',
        sourceUrl:   item.link ?? '',
        source,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      }));
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<RssArticle[]> => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((a) => a.title && a.sourceUrl);
}
