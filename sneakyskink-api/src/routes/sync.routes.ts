import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';

const router = Router();

router.post('/coach/:id', SyncController.syncCoach);
router.post('/league/:id', SyncController.syncLeague);
router.get('/queue', SyncController.getQueueStatus);

export default router;
