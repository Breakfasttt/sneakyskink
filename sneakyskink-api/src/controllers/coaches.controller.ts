import { Request, Response, NextFunction } from 'express';
import { CoachesService } from '../services/coaches.service.js';

export class CoachesController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

      const result = await CoachesService.getAllCoaches(search, limit, offset);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const includeTeams = req.query.includeTeams === 'true';

      const result = await CoachesService.getCoachById(id, includeTeams);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
