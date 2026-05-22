/**
 * Utilitaire d'affichage du tableau de bord console (Dashboard TUI)
 * adaptable à la taille du terminal.
 */

import readline from 'readline';

interface SystemStatus {
  db: string;
  redis: string;
  scheduler: string;
  worker: string;
}

export class ConsoleDashboard {
  private static statuses: SystemStatus = {
    db: 'INITIALIZING',
    redis: 'INITIALIZING',
    scheduler: 'STOPPED',
    worker: 'IDLE',
  };

  private static currentKeyIndex = -1;
  private static currentKeyMasked = 'N/A';
  private static hourlyRequests = 0;
  private static hourlyLimit = 1000;
  private static dailyRequests = 0;
  private static dailyLimit = 10000;
  private static hourlyResetMinutes = 0;
  private static dailyResetHours = 0;

  private static pacingRemainingMs = 0;
  private static pacingTotalMs = 0;

  private static currentActivity = 'Démarrage en cours...';
  private static lastResponse = 'Aucune';
  private static lastInsertedType = 'Aucun';
  private static lastInsertedTime = '';
  private static lastInsertedDetails = '';
  private static alertHistory: string[] = [];
  private static readonly MAX_ALERTS = 8;
  private static renderTimer: NodeJS.Timeout | null = null;

  // Scroll virtuel dans l'alt buffer
  private static scrollOffset = 0;

  private static BANNER = `    ███████╗███╗   ██╗███████╗ █████╗ ██╗  ██╗██╗   ██╗███████╗██╗  ██╗██╗███╗   ██╗██╗  ██╗
    ██╔════╝████╗  ██║██╔════╝██╔══██╗██║ ██╔╝╚██╗ ██╔╝██╔════╝██║ ██╔╝██║████╗  ██║██║ ██╔╝
    ███████╗██╔██╗ ██║█████╗  ███████║█████╔╝  ╚████╔╝ ███████╗█████╔╝ ██║██╔██╗ ██║█████╔╝ 
    ╚════██║██║╚██╗██║██╔══╝  ██╔══██║██╔═██╗   ╚██╔╝  ╚════██║██╔═██╗ ██║██║╚██╗██║██╔═██╗ 
    ███████║██║ ╚████║███████╗██║  ██║██║  ██╗   ██║   ███████║██║  ██╗██║██║ ╚████║██║  ██╗
    ╚══════╝╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
                     🦎  S N E A K Y   S K I N K   -   H A R V E S T E R  (v1.0.0) 🦎`;

  /**
   * Initialise le Dashboard et démarre le timer de rendu.
   */
  public static start(): void {
    if (this.renderTimer) return;

    if (!process.stdout.isTTY) return;

    // Entrer dans l'alternative screen buffer et masquer le curseur
    process.stdout.write('\x1B[?1049h');
    process.stdout.write('\x1B[?25l');
    // Activer le suivi de la roulette souris
    process.stdout.write('\x1B[?1000h');
    process.stdout.write('\x1B[?1015h');
    process.stdout.write('\x1B[?1006h');

    // Restaurer proprement sur exit
    process.on('exit', () => {
      this.stop();
    });

    // Écouter le redimensionnement de la console
    process.stdout.on('resize', () => this.render());

    // Écouter les touches clavier (stdin en raw mode pour ↑/↓)
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (key: string) => {
        // Ctrl+C → arrêt propre
        if (key === '\x03') {
          process.emit('SIGINT' as any);
          return;
        }
        // Flèche haut ou roulette haut
        if (key === '\x1B[A') {
          this.scrollOffset = Math.max(0, this.scrollOffset - 1);
          this.render();
        }
        // Flèche bas ou roulette bas
        if (key === '\x1B[B') {
          this.scrollOffset++;
          this.render();
        }
        // Page Up
        if (key === '\x1B[5~') {
          this.scrollOffset = Math.max(0, this.scrollOffset - 5);
          this.render();
        }
        // Page Down
        if (key === '\x1B[6~') {
          this.scrollOffset += 5;
          this.render();
        }
        // Souris SGR (roulette) : séquence \x1B[<btn;col;rowM
        const mouseMatch = key.match(/\x1B\[<(\d+);\d+;\d+M/);
        if (mouseMatch) {
          const btn = parseInt(mouseMatch[1]);
          if (btn === 64) { this.scrollOffset = Math.max(0, this.scrollOffset - 1); this.render(); }
          if (btn === 65) { this.scrollOffset++; this.render(); }
        }
      });
    }

    // Mettre à jour périodiquement (toutes les 200ms pour fluidifier le pacing)
    this.renderTimer = setInterval(() => {
      // Décrémenter le pacing
      if (this.pacingRemainingMs > 0) {
        this.pacingRemainingMs = Math.max(0, this.pacingRemainingMs - 200);
      }
      this.render();
    }, 200);

    // Empêcher que le timer bloque l'arrêt du processus
    this.renderTimer.unref();
  }

  /**
   * Arrête le timer de rendu.
   */
  public static stop(): void {
    if (this.renderTimer) {
      clearInterval(this.renderTimer);
      this.renderTimer = null;
    }
    if (process.stdout.isTTY) {
      // Désactiver le suivi souris
      process.stdout.write('\x1B[?1006l');
      process.stdout.write('\x1B[?1015l');
      process.stdout.write('\x1B[?1000l');
      process.stdout.write('\x1B[?25h');   // Réafficher le curseur
      process.stdout.write('\x1B[?1049l'); // Quitter l'alternative screen buffer
    }
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  }

  /**
   * Met à jour le statut d'un système.
   */
  public static updateStatus(system: keyof SystemStatus, status: string): void {
    this.statuses[system] = status.toUpperCase();
  }

  /**
   * Définit les informations de quota de la clé active.
   */
  public static setQuotaInfo(info: {
    keyIndex: number;
    keyMasked: string;
    hourlyRequests: number;
    hourlyLimit: number;
    dailyRequests: number;
    dailyLimit: number;
    hourlyResetMinutes: number;
    dailyResetHours: number;
  }): void {
    this.currentKeyIndex = info.keyIndex;
    this.currentKeyMasked = info.keyMasked;
    this.hourlyRequests = info.hourlyRequests;
    this.hourlyLimit = info.hourlyLimit;
    this.dailyRequests = info.dailyRequests;
    this.dailyLimit = info.dailyLimit;
    this.hourlyResetMinutes = info.hourlyResetMinutes;
    this.dailyResetHours = info.dailyResetHours;
  }

  /**
   * Définit le pacing courant.
   */
  public static setPacing(remainingMs: number, totalMs: number): void {
    this.pacingRemainingMs = remainingMs;
    this.pacingTotalMs = totalMs;
  }

  /**
   * Met à jour le message d'activité courante.
   */
  public static setActivity(activity: string): void {
    this.currentActivity = activity;
  }

  /**
   * Met à jour la dernière réponse reçue.
   */
  public static setLastResponse(responseInfo: string): void {
    this.lastResponse = responseInfo;
  }

  /**
   * Enregistre le dernier élément inséré en base de données.
   */
  public static setLastInserted(type: string, details: string): void {
    this.lastInsertedType = type;
    this.lastInsertedTime = new Date().toLocaleTimeString('fr-FR');
    this.lastInsertedDetails = details;
  }

  /**
   * Ajoute une alerte (Warning/Error) persistante dans le panneau du bas.
   */
  public static addAlert(level: 'WARN' | 'ERROR' | 'FATAL', message: string): void {
    const timestamp = new Date().toLocaleTimeString('fr-FR');
    const color = level === 'FATAL' || level === 'ERROR' ? '\x1B[31m' : '\x1B[33m'; // Rouge ou Jaune
    const reset = '\x1B[0m';
    
    this.alertHistory.push(`[${timestamp}] ${color}${level}${reset}: ${message}`);
    
    if (this.alertHistory.length > this.MAX_ALERTS) {
      this.alertHistory.shift();
    }
  }

  /**
   * Génère une barre de progression en ASCII.
   */
  private static makeProgressBar(value: number, max: number, width = 20): string {
    const percentage = Math.min(1, Math.max(0, value / max));
    const filledLength = Math.round(width * percentage);
    const emptyLength = width - filledLength;
    
    const filledStr = '█'.repeat(filledLength);
    const emptyStr = '░'.repeat(emptyLength);
    
    return `[${filledStr}${emptyStr}]`;
  }

  /**
   * Hauteur cible fixe du dashboard (lignes), indépendante de la taille du terminal.
   * Modifiez cette valeur pour ajuster la compacité de l'affichage.
   */
  private static readonly FIXED_HEIGHT = 26;

  /**
   * Redessine le tableau de bord en réécrivant la sortie sur place (sans scintillement).
   */
  private static render(): void {
    if (!process.stdout.isTTY) return;

    // La largeur reste adaptative pour le confort visuel, mais pas la hauteur
    const cols = process.stdout.columns || 80;

    let out = '';

    // Déplacer le curseur en haut à gauche (0,0) et effacer vers le bas
    out += '\x1B[H\x1B[J';

    const formatStatus = (status: string) => {
      if (status === 'OK' || status === 'CONNECTED' || status === 'RUNNING') {
        return `\x1B[32m${status}\x1B[0m`; // Vert
      }
      if (status === 'IDLE' || status === 'STOPPED') {
        return `\x1B[36m${status}\x1B[0m`; // Cyan
      }
      return `\x1B[31m${status}\x1B[0m`; // Rouge
    };

    const separatorWidth = Math.min(95, cols);
    const separator = '═'.repeat(separatorWidth) + '\n';
    const barWidth = cols >= 80 ? 25 : 15;

    // 1. Titre
    out += `\n  🦎  S N E A K Y   S K I N K   -   H A R V E S T E R  (v1.0.0) 🦎\n`;
    out += separator;

    // 2. Statuts des systèmes
    out += `  💻 SYSTEM STATUS: `;
    out += `Database: ${formatStatus(this.statuses.db)}  |  `;
    out += `Redis: ${formatStatus(this.statuses.redis)}  |  `;
    out += `Scheduler: ${formatStatus(this.statuses.scheduler)}  |  `;
    out += `Worker: ${formatStatus(this.statuses.worker)}\n`;
    out += separator;

    // 3. Quotas de la clé active
    out += `  🔑 ACTIVE API KEY: Clé #${this.currentKeyIndex + 1} (${this.currentKeyMasked})\n\n`;

    const hourlyBar = this.makeProgressBar(this.hourlyRequests, this.hourlyLimit, barWidth);
    const dailyBar = this.makeProgressBar(this.dailyRequests, this.dailyLimit, barWidth);

    out += `  📊 Hour Quota :  ${hourlyBar}  ${this.hourlyRequests}/${this.hourlyLimit}  (Reset dans ${this.hourlyResetMinutes}m)\n`;
    out += `  📊 Day Quota  :  ${dailyBar}  ${this.dailyRequests}/${this.dailyLimit}  (Reset dans ${this.dailyResetHours}h)\n`;
    out += separator;

    // 4. Barre de pacing
    out += `  ⏳ RATE PACING: `;
    if (this.pacingRemainingMs === -1) {
      out += `\x1B[33mDÉSACTIVÉ (Bypass actif)\x1B[0m\n`;
    } else if (this.pacingRemainingMs > 0) {
      const total = this.pacingTotalMs > 0 ? this.pacingTotalMs : 2500;
      const pacingBar = this.makeProgressBar(total - this.pacingRemainingMs, total, barWidth);
      const remainingSecs = (this.pacingRemainingMs / 1000).toFixed(1);
      out += `${pacingBar}  Attente : ${remainingSecs}s avant la prochaine requête...\n`;
    } else {
      out += `${'█'.repeat(barWidth)}  Prêt pour la prochaine requête !\n`;
    }
    out += separator;

    // 5. Activité en cours et dernière réponse
    out += `  ⚡ CURRENT ACTIVITY:\n`;
    out += `  > \x1B[1m${this.currentActivity}\x1B[0m\n`;
    out += `  📥 LAST RECEIVED RESPONSE:\n`;
    out += `  > \x1B[32m${this.lastResponse}\x1B[0m\n`;
    out += separator;

    // 5.5. Dernier élément inséré/mis à jour en BDD
    out += `  💾 DERNIER ÉLÉMENT SYNCHRONISÉ EN BDD:\n`;
    if (this.lastInsertedType === 'Aucun') {
      out += `  > Aucun élément synchronisé depuis le démarrage.\n`;
    } else {
      out += `  > [${this.lastInsertedTime}] \x1B[35m${this.lastInsertedType}\x1B[0m: ${this.lastInsertedDetails}\n`;
    }
    out += separator;

    // 6. Warnings & Erreurs — nombre fixe de lignes, indépendant du terminal
    out += `  ⚠️ WARNINGS & ERRORS DETECTED (Historique récent):\n`;

    // Lignes fixes consommées avant la section alertes : 21
    // FIXED_HEIGHT - 21 = nombre de lignes disponibles pour les alertes
    const LINES_BEFORE_ALERTS = 21;
    const maxAlertLines = Math.max(2, this.FIXED_HEIGHT - LINES_BEFORE_ALERTS);

    if (this.alertHistory.length === 0) {
      out += `  \x1B[32mAucun avertissement ou erreur détecté. Le système fonctionne parfaitement.\x1B[0m\n`;
      for (let i = 0; i < maxAlertLines - 1; i++) {
        out += '\n';
      }
    } else {
      for (let i = 0; i < maxAlertLines; i++) {
        const alertIndex = this.alertHistory.length - maxAlertLines + i;
        if (alertIndex >= 0 && this.alertHistory[alertIndex]) {
          out += `  ${this.alertHistory[alertIndex]}\n`;
        } else {
          out += '\n';
        }
      }
    }
    out += separator;

    // Appliquer le scroll virtuel : afficher seulement la tranche visible
    const rows = process.stdout.rows || 24;
    const allLines = out.split('\n');
    const totalLines = allLines.length;
    // Borner le scroll pour ne pas dépasser le contenu
    this.scrollOffset = Math.min(this.scrollOffset, Math.max(0, totalLines - rows + 1));
    const visibleLines = allLines.slice(this.scrollOffset, this.scrollOffset + rows - 1);

    // Indicateur de scroll en dernière ligne
    const canScrollUp = this.scrollOffset > 0;
    const canScrollDown = this.scrollOffset + rows - 1 < totalLines;
    const scrollHint = canScrollUp || canScrollDown
      ? `\x1B[2m  ↑/↓ ou molette pour scroller (ligne ${this.scrollOffset + 1}/${totalLines})\x1B[0m`
      : `\x1B[2m  ↑/↓ ou molette pour scroller\x1B[0m`;

    process.stdout.write(visibleLines.join('\n') + '\n' + scrollHint);
  }
}
export default ConsoleDashboard;

// Code de diagnostic pour détecter le chargement multiple de la classe
import fs from 'fs';
if (!(globalThis as any).__dashboards) {
  (globalThis as any).__dashboards = [];
}
(globalThis as any).__dashboards.push(ConsoleDashboard);
try {
  fs.appendFileSync('logs/harvester.log', JSON.stringify({
    level: 30,
    time: Date.now(),
    pid: process.pid,
    msg: `[DIAGNOSTIC] ConsoleDashboard chargé. Instance #${(globalThis as any).__dashboards.length}. Stack: ${new Error().stack?.replace(/\n/g, ' | ')}`
  }) + '\n');
} catch (e) {
  // Ignorer
}

