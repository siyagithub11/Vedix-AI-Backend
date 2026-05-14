import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma, NewsCategory } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function calcReadTime(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 200));
}

// GET /api/news
export async function getNews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit    = Math.min(50, parseInt(req.query.limit as string) || 10);
    const category = req.query.category as string | undefined;
    const search   = req.query.search as string | undefined;

    const where: Prisma.NewsWhereInput = {
      isPublished: true,
      ...(category ? { category: category as NewsCategory } : {}),
      ...(search ? {
        OR: [
          { title:        { contains: search, mode: 'insensitive' } },
          { summary:      { contains: search, mode: 'insensitive' } },
          { whyItMatters: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { blog: { select: { slug: true } } },
      }),
    ]);

    const data = items.map((n) => ({
      id:           n.id,
      slug:         n.slug,
      title:        n.title,
      summary:      n.summary,
      whyItMatters: n.whyItMatters,
      category:     n.category,
      source:       n.source,
      sourceUrl:    n.sourceUrl,
      imageUrl:     n.imageUrl,
      publishedAt:  n.publishedAt.toISOString(),
      readTime:     n.readTime,
      isPublished:  n.isPublished,
      blogId:       n.blogId ?? undefined,
      blogSlug:     (n as any).blog?.slug ?? undefined,
    }));

    res.json({
      success: true,
      data,
      meta: { page, limit, total, hasMore: page * limit < total },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/news/:slug
export async function getNewsItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await prisma.news.findUnique({
      where: { slug: req.params.slug as string },
      include: { blog: { select: { id: true, slug: true, title: true, tools: true } } },
    });

    if (!item || !item.isPublished) {
      res.status(404).json({ success: false, error: 'News item not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      data: {
        id:           item.id,
        slug:         item.slug,
        title:        item.title,
        summary:      item.summary,
        whyItMatters: item.whyItMatters,
        category:     item.category,
        source:       item.source,
        sourceUrl:    item.sourceUrl,
        imageUrl:     item.imageUrl,
        publishedAt:  item.publishedAt.toISOString(),
        readTime:     item.readTime,
        isPublished:  item.isPublished,
        blogId:       item.blogId ?? undefined,
        blogSlug:     (item as any).blog?.slug ?? undefined,
        relatedTools: (item as any).blog?.tools ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/news
export async function createNews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, summary, whyItMatters, body, category, source, sourceUrl, imageUrl, blogId } = req.body as {
      title: string; summary: string; whyItMatters: string; body: string;
      category: string; source: string; sourceUrl: string;
      imageUrl?: string; blogId?: string;
    };

    const slug = slugify(title);
    const readTime = calcReadTime(body || summary);

    const item = await prisma.news.create({
      data: {
        slug, title, summary, whyItMatters,
        body: body ?? '',
        category: category as NewsCategory,
        source, sourceUrl,
        imageUrl: imageUrl ?? null,
        publishedAt: new Date(),
        readTime,
        isPublished: false,
        ...(blogId ? { blog: { connect: { id: blogId } } } : {}),
      },
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/news/:id
export async function updateNews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, blogId, ...rest } = req.body as {
      action?: 'publish' | 'unpublish' | 'linkBlog';
      blogId?: string;
      [key: string]: unknown;
    };

    let data: Prisma.NewsUpdateInput = {};

    if (action === 'publish')   data = { isPublished: true };
    if (action === 'unpublish') data = { isPublished: false };
    if (action === 'linkBlog' && blogId) data = { blog: { connect: { id: blogId } } };
    if (!action) data = rest as Prisma.NewsUpdateInput;

    const updated = await prisma.news.update({ where: { id: req.params.id as string }, data });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
