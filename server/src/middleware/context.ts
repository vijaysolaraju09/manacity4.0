import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import pino from 'pino';

const logger = pino();

declare module 'express-serve-static-core' {
  interface Request {
    traceId: string;
    log: pino.Logger;
  }
}

const context = (req: Request, res: Response, next: NextFunction): void => {
  const traceId = randomUUID();
  req.traceId = traceId;
  req.log = logger.child({ traceId });

  req.log.info({ method: req.method, path: req.path }, 'request start');

  res.on('finish', () => {
    req.log.info({ status: res.statusCode }, 'request end');
  });

  next();
};

export default context;
