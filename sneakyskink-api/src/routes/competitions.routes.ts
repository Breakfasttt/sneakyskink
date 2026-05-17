import { Router } from 'express';
import { CompetitionsController } from '../controllers/competitions.controller.js';

const router = Router();

router.get('/', CompetitionsController.getAll);
router.get('/:id', CompetitionsController.getById);

export default router;
