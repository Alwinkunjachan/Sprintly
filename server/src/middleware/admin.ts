import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';

export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.member || req.member.role !== 'admin') {
    return next(ApiError.unauthorized('Admin access required'));
  }
  next();
}
