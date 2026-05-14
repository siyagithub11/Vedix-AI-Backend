import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AdminUser } from '@prisma/client';
import prisma from '../lib/prisma';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase: any = null;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('[ref]')) {
  console.warn('⚠️  Supabase credentials missing or invalid in .env. Admin auth will not work.');
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    console.warn('⚠️  Failed to initialize Supabase client. Check your SUPABASE_URL.');
  }
}

export interface AuthRequest extends Request {
  user?: AdminUser;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization token', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.slice(7);
  
  if (!supabase) {
    res.status(500).json({ success: false, error: 'Auth service not configured', code: 'CONFIG_ERROR' });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ success: false, error: 'Invalid or expired token', code: 'INVALID_TOKEN' });
    return;
  }

  const adminUser = await prisma.adminUser.findUnique({ where: { email: data.user.email! } });
  if (!adminUser) {
    res.status(403).json({ success: false, error: 'Access denied: not an admin', code: 'FORBIDDEN' });
    return;
  }

  req.user = adminUser;
  next();
}
