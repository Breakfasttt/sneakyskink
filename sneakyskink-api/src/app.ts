import express from 'express';
import cors from 'cors';
import { requestLogger } from './middlewares/request-logger.js';
import { errorHandler } from './middlewares/error.middleware.js';
import apiRouter from './routes/index.js';

const app = express();

// Configurer CORS
app.use(cors({
  origin: '*', // Permettre tous les accès en développement (à affiner en production)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middlewares globaux
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routeur principal de l'API REST
app.use('/', apiRouter);

// Gestionnaire d'erreurs global
app.use(errorHandler);

export default app;
