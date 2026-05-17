import { Router } from 'express';
import { LeaguesController } from '../controllers/leagues.controller.js';

const router = Router();

router.get('/', LeaguesController.getAll);
router.get('/:id', LeaguesController.getById);

export default router;
