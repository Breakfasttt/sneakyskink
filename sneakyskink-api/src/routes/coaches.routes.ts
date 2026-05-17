import { Router } from 'express';
import { CoachesController } from '../controllers/coaches.controller.js';

const router = Router();

router.get('/', CoachesController.getAll);
router.get('/:id', CoachesController.getById);

export default router;
