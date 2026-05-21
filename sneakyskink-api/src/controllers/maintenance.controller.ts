/**
 * Contrôleur pour gérer les requêtes HTTP de maintenance et d'audit.
 */

import { Request, Response, NextFunction } from 'express';
import { MaintenanceService } from '../services/maintenance.service.js';

export class MaintenanceController {
  /**
   * POST /api/maintenance/run
   * Déclenche la maintenance BDD à distance.
   */
  static async runMaintenance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await MaintenanceService.triggerMaintenance();
      res.status(202).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/maintenance/reports
   * Récupère l'historique des rapports d'audit de maintenance.
   */
  static async getAuditReports(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const result = await MaintenanceService.getAuditReports(limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
