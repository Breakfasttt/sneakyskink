/**
 * Middleware de limitation de débit (Rate Limiter) basé sur Redis.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment.js';
import { redisConnection } from '../lib/queue.js';
import { ApiError } from './error.middleware.js';

export async function rateLimiter(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Récupérer l'IP du client (gérer les éventuels proxy)
  const clientIp = (req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();

  const key = `ratelimit:ip:${clientIp}`;

  try {
    const requests = await redisConnection.incr(key);

    // Si c'est la première requête de la fenêtre, définir l'expiration
    if (requests === 1) {
      await redisConnection.pexpire(key, env.rateLimitWindowMs);
    }

    const ttlMs = await redisConnection.pttl(key);
    
    // Définir les en-têtes de limitation de débit standard
    res.setHeader('X-RateLimit-Limit', env.rateLimitMax);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, env.rateLimitMax - requests));
    res.setHeader('X-RateLimit-Reset', Math.ceil((Date.now() + (ttlMs > 0 ? ttlMs : env.rateLimitWindowMs)) / 1000));

    // Si la limite est dépassée, rejeter la requête
    if (requests > env.rateLimitMax) {
      throw new ApiError(429, 'Trop de requêtes. Veuillez réessayer plus tard.');
    }

    next();
  } catch (err) {
    if (err instanceof ApiError) {
      next(err);
    } else {
      // Ne pas bloquer l'application en cas d'erreur de connexion Redis
      next();
    }
  }
}
