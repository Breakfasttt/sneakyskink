/**
 * Routes pour les actions de synchronisation et la gestion du rate pacing.
 */

import { Router } from 'express';
import { SyncController } from '../controllers/sync.controller.js';
import { requireAdminKey } from '../middlewares/auth.middleware.js';

const router = Router();

// Route publique : statut de la file (lu par le frontend web)
router.get('/queue', SyncController.getQueueStatus);

// Routes publiques : actions de synchronisation à la demande (recherche/import)
router.post('/coach/:id', SyncController.syncCoach);
router.post('/league/:id', SyncController.syncLeague);
router.post('/competition/:id', SyncController.syncCompetition);

// Routes protégées : actions d'administration de la file d'attente
router.post('/league/:id/priority', requireAdminKey, SyncController.setLeaguePriority);
router.post('/queue/clean', requireAdminKey, SyncController.cleanQueue);
router.post('/queue/health-check', requireAdminKey, SyncController.forceHealthCheck);
router.post('/pacing/bypass', requireAdminKey, SyncController.bypassPacing);
router.post('/pacing/restore', requireAdminKey, SyncController.restorePacing);

export default router;
