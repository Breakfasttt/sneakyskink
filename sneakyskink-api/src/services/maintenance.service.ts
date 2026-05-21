/**
 * Service pour gérer les opérations de maintenance de l'API REST.
 */

import { prisma } from '../lib/prisma.js';
import { queueMaintenanceRun } from '../lib/queue.js';
import { logger } from '../lib/logger.js';

export class MaintenanceService {
  /**
   * Déclenche une maintenance manuelle asynchrone via la file BullMQ.
   */
  static async triggerMaintenance() {
    logger.info('⚡ [Maintenance Service] Déclenchement manuel de la maintenance BDD demandé.');
    const jobId = await queueMaintenanceRun('MANUAL');
    return {
      success: true,
      message: 'La tâche de maintenance de la base de données a été ajoutée à la file d\'attente (priorité Haute).',
      jobId,
      enqueuedAt: new Date(),
    };
  }

  /**
   * Récupère l'historique des rapports d'audit triés par date décroissante.
   */
  static async getAuditReports(limit = 50) {
    logger.info('🔍 [Maintenance Service] Récupération des rapports d\'audit BDD.');
    const reports = await prisma.auditReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return {
      success: true,
      count: reports.length,
      reports,
    };
  }
}
