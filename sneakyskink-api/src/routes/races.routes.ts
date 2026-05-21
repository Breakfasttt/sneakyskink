import { Router } from 'express';
import { RacesController } from '../controllers/races.controller.js';

const router = Router();

// Endpoint pour lister toutes les races
router.get('/', RacesController.getAll);

// Endpoint pour obtenir les détails d'une race par son identifiant
router.get('/:id', RacesController.getById);

export default router;
