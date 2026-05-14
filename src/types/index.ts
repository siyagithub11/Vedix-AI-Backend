export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta;
  error?: string;
  code?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AdminUser;
    }
  }
}
