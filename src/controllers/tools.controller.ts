import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { Prisma, ToolCategory, Pricing, SkillLevel } from '@prisma/client';

// GET /api/tools
export async function getTools(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit    = Math.min(100, parseInt(req.query.limit as string) || 24);
    const category = req.query.category as string | undefined;
    const pricing  = req.query.pricing as string | undefined;
    const skill    = req.query.skill as string | undefined;
    const search   = req.query.search as string | undefined;

    const where: Prisma.ToolWhereInput = {
      isActive: true,
      ...(category ? { category: category as ToolCategory } : {}),
      ...(pricing  ? { pricing:  pricing  as Pricing }       : {}),
      ...(skill    ? { skillLevel: skill  as SkillLevel }    : {}),
      ...(search   ? {
        OR: [
          { name:        { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.tool.count({ where }),
      prisma.tool.findMany({
        where,
        orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: { blogs: { select: { id: true } } },
      }),
    ]);

    const data = items.map((t) => ({
      id:          t.id,
      slug:        t.slug,
      name:        t.name,
      description: t.description,
      websiteUrl:  t.websiteUrl,
      logoUrl:     t.logoUrl ?? undefined,
      category:    t.category,
      pricing:     t.pricing,
      skillLevel:  t.skillLevel,
      rating:      t.rating ?? undefined,
      blogIds:     (t as any).blogs.map((b: any) => b.id),
    }));

    res.json({ success: true, data, meta: { page, limit, total, hasMore: page * limit < total } });
  } catch (err) {
    next(err);
  }
}

// GET /api/tools/:slug
export async function getToolItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tool = await prisma.tool.findUnique({
      where: { slug: req.params.slug as string },
      include: { blogs: { select: { id: true, slug: true, title: true, excerpt: true } } },
    });

    if (!tool || !tool.isActive) {
      res.status(404).json({ success: false, error: 'Tool not found', code: 'NOT_FOUND' });
      return;
    }

    res.json({
      success: true,
      data: {
        id:          tool.id,
        slug:        tool.slug,
        name:        tool.name,
        description: tool.description,
        websiteUrl:  tool.websiteUrl,
        logoUrl:     tool.logoUrl ?? undefined,
        category:    tool.category,
        pricing:     tool.pricing,
        skillLevel:  tool.skillLevel,
        rating:      tool.rating ?? undefined,
        blogIds:     (tool as any).blogs.map((b: any) => b.id),
        blogs:       (tool as any).blogs,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/tools
export async function createTool(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { slug, name, description, websiteUrl, logoUrl, category, pricing, skillLevel, rating } = req.body as {
      slug: string; name: string; description: string; websiteUrl: string;
      logoUrl?: string; category: string; pricing: string; skillLevel: string; rating?: number;
    };

    const tool = await prisma.tool.create({
      data: {
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 60),
        name, description, websiteUrl,
        logoUrl: logoUrl ?? null,
        category: category as ToolCategory,
        pricing:  pricing  as Pricing,
        skillLevel: skillLevel as SkillLevel,
        rating: rating ?? null,
      },
    });

    res.status(201).json({ success: true, data: tool });
  } catch (err) {
    next(err);
  }
}
