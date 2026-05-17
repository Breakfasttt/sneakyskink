import { Request, Response, NextFunction } from 'express';
import { TeamsService } from '../services/teams.service.js';

export class TeamsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const raceIdParam = req.query.raceId as string | undefined;
      const raceId = raceIdParam !== undefined ? parseInt(raceIdParam, 10) : undefined;
      const coachId = req.query.coachId as string | undefined;
      const search = req.query.search as string | undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

      const result = await TeamsService.getAllTeams(raceId, coachId, search, limit, offset);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const includePlayers = req.query.includePlayers === 'true';

      const result = await TeamsService.getTeamById(id, includePlayers);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
