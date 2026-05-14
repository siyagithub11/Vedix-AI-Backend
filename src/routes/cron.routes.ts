import { Router } from 'express';
import { fetchAndIngestNews } from '../cron/newsFetch';

export const cronRoutes = Router();

cronRoutes.get('/fetch-news', async (req, res) => {
  // Optional: Verify request is from Vercel
  // if (req.headers['x-vercel-cron'] !== '1') {
  //   return res.status(401).json({ error: 'Unauthorized' });
  // }

  try {
    console.log('[Cron Endpoint] Triggering news fetch...');
    // We don't await if we want it to run in background, 
    // but for crons it's better to await so Vercel knows when it's done.
    await fetchAndIngestNews();
    res.json({ success: true, message: 'News fetch completed' });
  } catch (error) {
    console.error('[Cron Endpoint] Error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch news' });
  }
});
