import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireAdminKey } from '../middlewares/auth.middleware.js';

const router = Router();

// Route publique : statut de la file (lu par le frontend web)
router.get('/queue', SyncController.getQueueStatus);

// Routes protégées : actions de synchronisation et nettoyage
router.post('/coach/:id', requireAdminKey, SyncController.syncCoach);
router.post('/league/:id', requireAdminKey, SyncController.syncLeague);
router.post('/queue/clean', requireAdminKey, SyncController.cleanQueue);

export default router;
