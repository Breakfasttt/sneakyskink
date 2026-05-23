import { Router } from 'express';
import { LeaguesController } from '../controllers/leagues.controller.js';
import { requireAdminKey } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', LeaguesController.getAll);
router.get('/cyanide/search', LeaguesController.searchCyanide);
router.get('/:id', LeaguesController.getById);

// Admin route
router.patch('/:id/active', requireAdminKey, LeaguesController.toggleActive);

export default router;
