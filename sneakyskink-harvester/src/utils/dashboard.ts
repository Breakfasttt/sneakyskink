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
  private static alertHistory: string[] = [];
  private static readonly MAX_ALERTS = 8;
  private static renderTimer: NodeJS.Timeout | null = null;

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

    // Entrer dans l'alternative screen buffer pour éviter de polluer l'historique et masquer le curseur
    process.stdout.write('\x1B[?1049h');
    process.stdout.write('\x1B[?25l');

    // Restaurer proprement sur exit
    process.on('exit', () => {
      this.stop();
    });

    // Écouter le redimensionnement de la console
    const onResize = () => {
      this.render();
    };
    process.stdout.on('resize', onResize);

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
      process.stdout.write('\x1B[?25h');   // Réafficher le curseur
      process.stdout.write('\x1B[?1049l'); // Quitter l'alternative screen buffer
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
   * Redessine le tableau de bord en réécrivant la sortie sur place (sans scintillement).
   */
  private static render(): void {
    if (!process.stdout.isTTY) return;

    const rows = process.stdout.rows || 24;
    const cols = process.stdout.columns || 80;

    let out = '';

    // Déplacer le curseur en haut à gauche (0,0) et effacer vers le bas
    out += '\x1B[H\x1B[J';

    // 1. Bannière ou titre simple selon la hauteur dispo
    const showBanner = rows >= 32;

    if (showBanner) {
      out += this.BANNER + '\n';
    } else {
      out += `\n  🦎  S N E A K Y   S K I N K   -   H A R V E S T E R  (v1.0.0) 🦎\n`;
    }

    const separatorWidth = Math.min(95, cols);
    const separator = '═'.repeat(separatorWidth) + '\n';

    out += separator;

    // 2. Statuts des systèmes
    const formatStatus = (status: string) => {
      if (status === 'OK' || status === 'CONNECTED' || status === 'RUNNING') {
        return `\x1B[32m${status}\x1B[0m`; // Vert
      }
      if (status === 'IDLE' || status === 'STOPPED') {
        return `\x1B[36m${status}\x1B[0m`; // Cyan
      }
      return `\x1B[31m${status}\x1B[0m`; // Rouge
    };

    out += `  💻 SYSTEM STATUS: `;
    out += `Database: ${formatStatus(this.statuses.db)}  |  `;
    out += `Redis: ${formatStatus(this.statuses.redis)}  |  `;
    out += `Scheduler: ${formatStatus(this.statuses.scheduler)}  |  `;
    out += `Worker: ${formatStatus(this.statuses.worker)}\n`;
    out += separator;

    // 3. Quotas de la clé active
    out += `  🔑 ACTIVE API KEY: Clé #${this.currentKeyIndex + 1} (${this.currentKeyMasked})\n\n`;
    
    const hourlyBar = this.makeProgressBar(this.hourlyRequests, this.hourlyLimit, 25);
    const dailyBar = this.makeProgressBar(this.dailyRequests, this.dailyLimit, 25);
    
    out += `  📊 Hour Quota :  ${hourlyBar}  ${this.hourlyRequests}/${this.hourlyLimit}  (Reset dans ${this.hourlyResetMinutes}m)\n`;
    out += `  📊 Day Quota  :  ${dailyBar}  ${this.dailyRequests}/${this.dailyLimit}  (Reset dans ${this.dailyResetHours}h)\n`;
    out += separator;

    // 4. Barre de pacing
    out += `  ⏳ RATE PACING: `;
    if (this.pacingRemainingMs > 0) {
      const total = this.pacingTotalMs > 0 ? this.pacingTotalMs : 2500;
      const pacingBar = this.makeProgressBar(total - this.pacingRemainingMs, total, 25);
      const remainingSecs = (this.pacingRemainingMs / 1000).toFixed(1);
      out += `${pacingBar}  Attente : ${remainingSecs}s avant la prochaine requête...\n`;
    } else {
      out += `${'█'.repeat(25)}  Prêt pour la prochaine requête !\n`;
    }
    out += separator;

    // 5. Activité en cours
    out += `  ⚡ CURRENT ACTIVITY:\n`;
    out += `  > \x1B[1m${this.currentActivity}\x1B[0m\n`;
    out += separator;

    // 6. Warnings & Erreurs détectés
    out += `  ⚠️ WARNINGS & ERRORS DETECTED (Historique récent):\n`;

    // Calculer la hauteur fixe pour les alertes pour éviter tout scrolling.
    const usedLines = showBanner ? 24 : 19;
    const maxAlertLines = Math.max(2, rows - usedLines);

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

    // S'assurer de ne jamais dépasser la hauteur du terminal pour éviter tout scrolling.
    let lines = out.split('\n');
    if (lines.length > rows) {
      lines = lines.slice(0, rows);
    }
    process.stdout.write(lines.join('\n'));
  }
}
export default ConsoleDashboard;
