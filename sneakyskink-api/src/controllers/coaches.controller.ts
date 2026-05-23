import { Request, Response, NextFunction } from 'express';
import { CoachesService } from '../services/coaches.service.js';

export class CoachesController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const leagueId = req.query.leagueId as string | undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '100', 10), 1000);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);
      const sortBy = req.query.sortBy as string | undefined;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' | undefined;

      const result = await CoachesService.getAllCoaches(search, limit, offset, sortBy, sortOrder, leagueId);
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
