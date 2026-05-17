import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = 'statusCode' in err ? err.statusCode : 500;
  const message = err.message || 'Une erreur interne est survenue.';

  // Log de l'erreur avec Pino
  if (statusCode >= 500) {
    logger.error(err, `❌ [HTTP 500] Erreur sur ${req.method} ${req.originalUrl}`);
  } else {
    logger.warn(`⚠️ [HTTP ${statusCode}] ${req.method} ${req.originalUrl} : ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
