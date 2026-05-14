export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
