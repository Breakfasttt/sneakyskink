import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireAdminKey } from '../middlewares/auth.middleware.js';

const router = Router();

// Sécuriser toutes les routes de synchronisation
router.use(requireAdminKey);

router.post('/coach/:id', SyncController.syncCoach);
router.post('/league/:id', SyncController.syncLeague);
router.get('/queue', SyncController.getQueueStatus);
router.post('/queue/clean', SyncController.cleanQueue);

export default router;
