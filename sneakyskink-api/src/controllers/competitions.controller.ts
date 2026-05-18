import { Request, Response, NextFunction } from 'express';
import { CompetitionsService } from '../services/competitions.service.js';

export class CompetitionsController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const leagueId = req.query.leagueId as string | undefined;
      const format = req.query.format as string | undefined;
      const status = req.query.status as string | undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

      const result = await CompetitionsService.getAllCompetitions(
        leagueId,
        format,
        status,
        limit,
        offset
      );
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const includeMatches = req.query.includeMatches !== 'false';

      const result = await CompetitionsService.getCompetitionById(id, includeMatches);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
