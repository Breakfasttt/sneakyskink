/**
 * Middleware de sécurité pour valider la clé API administrateur.
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment.js';
import { ApiError } from './error.middleware.js';

export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  // Extraire la clé depuis Authorization ou x-admin-key
  let clientKey = req.headers['x-admin-key'] as string;

  if (!clientKey && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      clientKey = parts[1];
    }
  }

  // Comparer la clé fournie avec celle attendue
  if (!clientKey || clientKey !== env.adminApiKey) {
    throw new ApiError(401, 'Clé d\'administration invalide ou absente.');
  }

  next();
}
