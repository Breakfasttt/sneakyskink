/**
 * Service de suivi de l'activité du Harvester.
 * Permet de déterminer depuis quand le démon est inactif.
 */
export class ActivityTracker {
  private static lastActivityTime = Date.now();

  /**
   * Enregistre une activité récente (traitement de job, appel API, etc.).
   */
  public static touch(): void {
    this.lastActivityTime = Date.now();
  }

  /**
   * Retourne le timestamp de la dernière activité connue.
   */
  public static getLastActivityTime(): number {
    return this.lastActivityTime;
  }
}
