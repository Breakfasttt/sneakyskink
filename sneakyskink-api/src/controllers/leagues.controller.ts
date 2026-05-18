import { Request, Response, NextFunction } from 'express';
import { LeaguesService } from '../services/leagues.service.js';

export class LeaguesController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const activeParam = req.query.active as string | undefined;
      const active = activeParam !== undefined ? activeParam === 'true' : undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

      const result = await LeaguesService.getAllLeagues(active, limit, offset);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async searchCyanide(req: Request, res: Response, next: NextFunction) {
    try {
      const query = req.query.query as string;
      if (!query) {
        return res.status(400).json({ success: false, message: "Le paramètre 'query' est obligatoire." });
      }

      const result = await LeaguesService.searchCyanideLeagues(query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const includeCompetitions = req.query.includeCompetitions !== 'false';

      const result = await LeaguesService.getLeagueById(id, includeCompetitions);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
