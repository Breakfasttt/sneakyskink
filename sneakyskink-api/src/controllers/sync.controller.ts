/**
 * Contrôleur pour la gestion de la synchronisation à la demande
 * et la configuration du rate pacing de l'API.
 */

import { Request, Response, NextFunction } from 'express';
import { SyncService } from '../services/sync.service.js';
import { ApiError } from '../middlewares/error.middleware.js';

export class SyncController {
  static async syncCoach(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new ApiError(400, "L'identifiant du coach est obligatoire.");
      }

      const result = await SyncService.syncCoach(id);
      res.status(202).json(result); // 202 Accepted pour les traitements asynchrones
    } catch (error) {
      next(error);
    }
  }

  static async syncLeague(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new ApiError(400, "L'identifiant de la ligue est obligatoire.");
      }

      const result = await SyncService.syncLeague(id);
      res.status(202).json(result); // 202 Accepted pour les traitements asynchrones
    } catch (error) {
      next(error);
    }
  }

  static async syncCompetition(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new ApiError(400, "L'identifiant de la compétition est obligatoire.");
      }

      const result = await SyncService.syncCompetition(id);
      res.status(202).json(result); // 202 Accepted pour les traitements asynchrones
    } catch (error) {
      next(error);
    }
  }

  static async getQueueStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.getQueueStatus();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async cleanQueue(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.cleanQueue();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async bypassPacing(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.bypassPacing();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async restorePacing(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.restorePacing();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async forceHealthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SyncService.forceHealthCheck();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async setLeaguePriority(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new ApiError(400, "L'identifiant de la ligue est obligatoire.");
      }

      const { isPriority } = req.body;
      if (typeof isPriority !== 'boolean') {
        throw new ApiError(400, "Le champ 'isPriority' doit être un booléen.");
      }

      const result = await SyncService.setLeaguePriority(id, isPriority);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
