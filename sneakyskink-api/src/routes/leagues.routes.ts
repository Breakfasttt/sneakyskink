import { Router } from 'express';
import { LeaguesController } from '../controllers/leagues.controller.js';

const router = Router();

router.get('/', LeaguesController.getAll);
router.get('/cyanide/search', LeaguesController.searchCyanide);
router.get('/:id', LeaguesController.getById);

export default router;
