import { Request, Response, NextFunction } from 'express';
import { MatchesService } from '../services/matches.service.js';

export class MatchesController {
  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const leagueId = req.query.leagueId as string | undefined;
      const competitionId = req.query.competitionId as string | undefined;
      const teamId = req.query.teamId as string | undefined;
      const coachId = req.query.coachId as string | undefined;
      const status = req.query.status as string | undefined;

      const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 100);
      const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

      const result = await MatchesService.getAllMatches(
        leagueId,
        competitionId,
        teamId,
        coachId,
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

      const result = await MatchesService.getMatchById(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
