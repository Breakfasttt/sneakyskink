import { Router } from 'express';
import { MatchesController } from '../controllers/matches.controller.js';

const router = Router();

router.get('/', MatchesController.getAll);
router.get('/:id', MatchesController.getById);

export default router;
