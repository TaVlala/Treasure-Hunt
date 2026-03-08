// Standard API response envelope types used across all endpoints.
// Every API response from the server wraps data in this shape.

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string[]>; // field-level validation errors
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Paginated list responses
export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
