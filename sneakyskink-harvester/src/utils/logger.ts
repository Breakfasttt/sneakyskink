import pino from 'pino';
import fs from 'fs';
import { env } from '../config/environment.js';
import { ConsoleDashboard } from './dashboard.js';

// S'assurer que le dossier de logs existe
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

// Stream pour écrire tous les logs dans un fichier
const fileStream = fs.createWriteStream('logs/harvester.log', { flags: 'a' });

// Stream pour envoyer les logs pertinents au Dashboard de la console
const dashboardStream = {
  write(chunk: string) {
    try {
      const data = JSON.parse(chunk);
      const msg = data.msg || '';
      const level = data.level || 30;

      // Niveaux Pino : 30 = info, 20 = debug, 40 = warn, 50 = error, 60 = fatal
      if (level >= 40) {
        let label: 'WARN' | 'ERROR' | 'FATAL' = 'WARN';
        if (level === 50) label = 'ERROR';
        if (level >= 60) label = 'FATAL';
        ConsoleDashboard.addAlert(label, msg);
      } else {
        // On n'affiche que l'activité pertinente
        ConsoleDashboard.setActivity(msg);
      }
    } catch (err) {
      // Ignorer silencieusement les erreurs de parsing
    }
  }
};

const isDev = env.nodeEnv === 'development';

const streams: any[] = [{ stream: fileStream }];

if (process.stdout.isTTY) {
  streams.push({ stream: dashboardStream });
} else {
  // En mode non-interactif (sans TTY), on affiche les logs bruts de Pino sur stdout.
  streams.push({ stream: process.stdout });
}

export const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
  },
  pino.multistream(streams)
);

export default logger;
