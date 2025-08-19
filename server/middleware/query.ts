import { Request, Response, NextFunction } from 'express';
import { parsePagination } from '../utils/pagination';

export function queryParser(req: Request, _res: Response, next: NextFunction): void {
  const options = parsePagination(req.query);
  (req as any).pagination = options;
  next();
}

