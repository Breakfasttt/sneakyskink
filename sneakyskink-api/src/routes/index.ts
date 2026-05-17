import { Router } from 'express';
import leaguesRouter from './leagues.routes.js';
import competitionsRouter from './competitions.routes.js';
import teamsRouter from './teams.routes.js';
import coachesRouter from './coaches.routes.js';
import matchesRouter from './matches.routes.js';
import syncRouter from './sync.routes.js';
import statsRouter from './stats.routes.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Endpoint d'index et de santé de l'API REST
router.get('/', async (req, res, next) => {
  try {
    // Calculer quelques statistiques rapides de la base de données
    const [leaguesCount, competitionsCount, teamsCount, coachesCount, matchesCount] = await Promise.all([
      prisma.league.count(),
      prisma.competition.count(),
      prisma.team.count(),
      prisma.coach.count(),
      prisma.match.count(),
    ]);

    res.json({
      name: 'SneakySkink REST API',
      version: '1.0.0',
      description: 'API REST custom hautement optimisée pour Blood Bowl 3',
      status: 'UP',
      timestamp: new Date(),
      stats: {
        leagues: leaguesCount,
        competitions: competitionsCount,
        teams: teamsCount,
        coaches: coachesCount,
        matches: matchesCount,
      },
      endpoints: {
        leagues: '/leagues',
        competitions: '/competitions',
        teams: '/teams',
        coaches: '/coaches',
        matches: '/matches',
        sync: {
          coach: '/sync/coach/:id',
          league: '/sync/league/:id',
        },
        stats: {
          global: '/stats/global',
          activity: '/stats/activity',
          coach: '/stats/coach/:id',
          competition: '/stats/competition/:id',
          league: '/stats/league/:id',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// Enregistrer les routeurs enfants
router.use('/leagues', leaguesRouter);
router.use('/competitions', competitionsRouter);
router.use('/teams', teamsRouter);
router.use('/coaches', coachesRouter);
router.use('/matches', matchesRouter);
router.use('/sync', syncRouter);
router.use('/stats', statsRouter);

export default router;
