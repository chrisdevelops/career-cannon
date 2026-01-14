import type { Request, Response, NextFunction } from 'express';
import { serverError } from '../lib/api-response.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  serverError(res, err);
}
