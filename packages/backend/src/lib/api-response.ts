import type { Response } from 'express';

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function success<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies ApiSuccess<T>);
}

export function error(
  res: Response,
  code: string,
  message: string,
  status = 400,
  details?: unknown
): void {
  res.status(status).json({
    success: false,
    error: { code, message, details },
  } satisfies ApiError);
}

export function notFound(res: Response, entity: string): void {
  error(res, 'NOT_FOUND', `${entity} not found`, 404);
}

export function validationError(res: Response, details: unknown): void {
  error(res, 'VALIDATION_ERROR', 'Invalid request data', 400, details);
}

export function serverError(res: Response, err: unknown): void {
  console.error('Server error:', err);
  error(
    res,
    'INTERNAL_ERROR',
    'An unexpected error occurred',
    500,
    process.env.NODE_ENV === 'development' ? String(err) : undefined
  );
}
