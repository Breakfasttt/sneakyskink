import { Router } from 'express';
import { StatsController } from '../controllers/stats.controller.js';

const router = Router();

router.get('/global', StatsController.getGlobalStats);
router.get('/activity', StatsController.getActivityStats);
router.get('/coach/:id', StatsController.getCoachStats);
router.get('/competition/:id', StatsController.getCompetitionStats);
router.get('/league/:id', StatsController.getLeagueStats);
router.get('/team/:id', StatsController.getTeamStats);
router.get('/player/:id', StatsController.getPlayerStats);

export default router;
