/**
 * Routes d'administration pour la maintenance et l'audit de la BDD.
 */

import { Router } from 'express';
import { MaintenanceController } from '../controllers/maintenance.controller.js';
import { requireAdminKey } from '../middlewares/auth.middleware.js';

const router = Router();

// Toutes les routes de maintenance nécessitent la clé d'administration
router.use(requireAdminKey);

router.post('/run', MaintenanceController.runMaintenance);
router.get('/reports', MaintenanceController.getAuditReports);

export default router;
