import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/stats.service.js';

export class StatsController {
  static async getCoachStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await StatsService.getCoachStats(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getCompetitionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await StatsService.getCompetitionStats(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getLeagueStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await StatsService.getLeagueStats(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getGlobalStats(req: Request, res: Response, next: NextFunction) {
    try {
      const isOfficial = req.query.official === 'true';
      const result = await StatsService.getGlobalStats(isOfficial);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getActivityStats(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await StatsService.getActivityStats();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getTeamStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await StatsService.getTeamStats(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async getPlayerStats(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const result = await StatsService.getPlayerStats(id);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
