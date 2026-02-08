import { Hono } from 'hono';
import { z } from 'zod';
import FeedParser from 'feedparser';
import axios from 'axios';
import Redis from 'ioredis';

const app = new Hono();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const FeedItemSchema = z.object({
  title: z.string(),
  link: z.string(),
  description: z.string().optional(),
  pubDate: z.string().optional(),
  author: z.string().optional(),
});

app.get('/feed', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'URL required' }, 400);

  // 1. Cache Check
  const cached = await redis.get(url);
  if (cached) return c.json({ items: JSON.parse(cached), _cached: true });

  try {
    const response = await axios.get(url, { responseType: 'stream', timeout: 5000 });
    const fp = new FeedParser({});
    const items: any[] = [];

    response.data.pipe(fp);

    return new Promise((resolve) => {
      fp.on('readable', function() {
        let item;
        while (item = fp.read()) {
          items.push(FeedItemSchema.parse({
            title: item.title,
            link: item.link,
            description: item.summary || item.description,
            pubDate: item.pubdate || item.date,
            author: item.author
          }));
        }
      });

      fp.on('end', async () => {
        await redis.set(url, JSON.stringify(items), 'EX', 300); // 5 min cache
        resolve(c.json({ items }));
      });

      fp.on('error', (err) => resolve(c.json({ error: err.message }, 500)));
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

app.get('/health', (c) => c.json({ status: 'ok', engine: 'Vox-Elite-v1' }));

export default app;
