import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
}

function calcReadTime(content: string): number {
  return Math.max(1, Math.round(content.split(/\s+/).length / 200));
}

// GET /api/blog
export async function getBlogFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page  = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 10);
    const tag    = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Prisma.BlogWhereInput = {
      isPublished: true,
      ...(tag ? { tags: { has: tag } } : {}),
      ...(search ? {
        OR: [
          { title:   { contains: search, mode: 'insensitive' } },
          { excerpt: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.blog.count({ where }),
      prisma.blog.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { tools: { select: { id: true, slug: true, name: true, logoUrl: true } }, news: { select: { id: true } } },
      }),
    ]);

    const data = items.map((p) => ({
      id:          p.id,
      slug:        p.slug,
      title:       p.title,
      excerpt:     p.excerpt,
      content:     p.content,
      coverImage:  p.coverImage ?? undefined,
      tags:        p.tags,
      readTime:    p.readTime,
      publishedAt: (p.publishedAt ?? p.createdAt).toISOString(),
      isPublished: p.isPublished,
      toolIds:     (p as any).tools.map((t: any) => t.id),
      newsIds:     (p as any).news.map((n: any) => n.id),
    }));

    res.json({ success: true, data, meta: { page, limit, total, hasMore: page * limit < total } });
  } catch (err) {
    next(err);
  }
}

// GET /api/blog/:slug
export async function getBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const post = await prisma.blog.findUnique({
      where: { slug: req.params.slug as string },
      include: {
        tools: true,
        news:  { select: { id: true, slug: true, title: true, category: true, publishedAt: true } },
      },
    });

    if (!post || !post.isPublished) {
      res.status(404).json({ success: false, error: 'Blog post not found', code: 'NOT_FOUND' });
      return;
    }

    const relatedBlogs = await prisma.blog.findMany({
      where: { isPublished: true, tags: { hasSome: post.tags }, NOT: { id: post.id } },
      take: 3,
      orderBy: { publishedAt: 'desc' },
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true, readTime: true, publishedAt: true, tags: true },
    });

    res.json({
      success: true,
      data: {
        id:           post.id,
        slug:         post.slug,
        title:        post.title,
        excerpt:      post.excerpt,
        content:      post.content,
        coverImage:   post.coverImage ?? undefined,
        tags:         post.tags,
        readTime:     post.readTime,
        publishedAt:  (post.publishedAt ?? post.createdAt).toISOString(),
        isPublished:  post.isPublished,
        toolIds:      (post as any).tools.map((t: any) => t.id),
        newsIds:      (post as any).news.map((n: any) => n.id),
        tools:        (post as any).tools,
        newsItems:    (post as any).news,
        relatedBlogs,
        faq:          post.faq,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/blog
export async function createBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, content, excerpt, tags, toolIds, newsIds, coverImage } = req.body as {
      title: string; content: string; excerpt: string; tags: string[];
      toolIds?: string[]; newsIds?: string[]; coverImage?: string;
    };

    const slug = slugify(title);
    const readTime = calcReadTime(content);

    const post = await prisma.blog.create({
      data: {
        slug, title, content, excerpt,
        tags: tags ?? [],
        readTime,
        coverImage: coverImage ?? null,
        isPublished: false,
        tools:  toolIds?.length ? { connect: toolIds.map((id) => ({ id })) }  : undefined,
        news:   newsIds?.length ? { connect: newsIds.map((id) => ({ id })) }   : undefined,
      },
    });

    res.status(201).json({ success: true, data: post });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/blog/:id
export async function updateBlogPost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { action, ...rest } = req.body as { action?: 'publish' | 'unpublish'; [key: string]: unknown };

    let data: Prisma.BlogUpdateInput = {};
    if (action === 'publish')   data = { isPublished: true,  publishedAt: new Date() };
    if (action === 'unpublish') data = { isPublished: false };
    if (!action) data = rest as Prisma.BlogUpdateInput;

    const updated = await prisma.blog.update({ where: { id: req.params.id as string }, data });
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}
