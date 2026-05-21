import { Request, Response, NextFunction } from 'express';
import { RacesService } from '../services/races.service.js';

/**
 * Contrôleur REST pour exposer les données du dictionnaire des races de BB3.
 */
export class RacesController {
  /**
   * Retourne la liste complète de toutes les races.
   */
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const races = RacesService.getAll();
      res.json({
        success: true,
        total: races.length,
        data: races,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Retourne une race spécifique par son identifiant unique.
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "L'identifiant de la race doit être un nombre valide.",
        });
      }

      const race = RacesService.getById(id);
      if (!race) {
        return res.status(404).json({
          success: false,
          message: `La race avec l'ID ${id} n'existe pas.`,
        });
      }

      res.json({
        success: true,
        data: race,
      });
    } catch (error) {
      next(error);
    }
  }
}
