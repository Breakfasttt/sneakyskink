import axios, { AxiosInstance } from 'axios';
import {
  League,
  Competition,
  Team,
  Player,
  Match,
  Coach,
  PlayerMatchStats
} from 'sneakyskink-bdd';

export interface ClientConfig {
  baseUrl: string;
  timeout?: number;
  apiKey?: string;
}

export interface SyncQueueState {
  active: number;
  waiting: number;
  completed: number;
  failed: number;
}

export interface GlobalStats {
  leaguesCount: number;
  competitionsCount: number;
  teamsCount: number;
  coachesCount: number;
  matchesCount: number;
}

export class SneakySkinkApiClient {
  private client: AxiosInstance;

  constructor(config: ClientConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl.replace(/\/+$/, ''),
      timeout: config.timeout || 15000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
      },
    });
  }

  /**
   * 🔍 Récupère l'état général et la version de l'API
   */
  public async getStatus(): Promise<{
    name: string;
    version: string;
    description: string;
    status: string;
    timestamp: string;
    stats: {
      leagues: number;
      competitions: number;
      teams: number;
      coaches: number;
      matches: number;
    };
  }> {
    const res = await this.client.get('/');
    return res.data;
  }

  /**
   * 🏆 Récupère la liste de toutes les ligues enregistrées
   */
  public async getLeagues(): Promise<League[]> {
    const res = await this.client.get('/leagues');
    return res.data;
  }

  /**
   * 📡 Cherche des ligues directement sur l'API de Cyanide (non encore importées)
   */
  public async searchCyanideLeagues(query: string): Promise<any> {
    const res = await this.client.get('/leagues/cyanide/search', { params: { query } });
    return res.data;
  }

  /**
   * 🏆 Récupère les détails complets d'une ligue spécifique
   */
  public async getLeague(id: string): Promise<League & { competitions: Competition[] }> {
    const res = await this.client.get(`/leagues/${id}`);
    return res.data;
  }

  /**
   * 🎯 Récupère les compétitions avec des filtres optionnels
   */
  public async getCompetitions(params?: { leagueId?: string }): Promise<Competition[]> {
    const res = await this.client.get('/competitions', { params });
    return res.data;
  }

  /**
   * 🎯 Récupère une compétition spécifique par son ID
   */
  public async getCompetition(id: string): Promise<Competition & { league: League }> {
    const res = await this.client.get(`/competitions/${id}`);
    return res.data;
  }

  /**
   * 🦎 Récupère la liste des équipes enregistrées avec filtres optionnels
   */
  public async getTeams(params?: { search?: string; race?: number }): Promise<Team[]> {
    const res = await this.client.get('/teams', { params });
    return res.data;
  }

  /**
   * 🦎 Récupère le roster complet et les détails d'une équipe
   */
  public async getTeam(id: string): Promise<Team & { coach: Coach; players: Player[] }> {
    const res = await this.client.get(`/teams/${id}`);
    return res.data;
  }

  /**
   * 👥 Récupère la liste globale de tous les coachs
   */
  public async getCoaches(params?: { search?: string; limit?: number }): Promise<Coach[]> {
    const res = await this.client.get('/coaches', { params });
    return res.data;
  }

  /**
   * 👥 Récupère un coach avec la liste de ses équipes
   */
  public async getCoach(id: string): Promise<Coach & { teams: Team[] }> {
    const res = await this.client.get(`/coaches/${id}`, { params: { includeTeams: true } });
    return res.data;
  }

  /**
   * ⚽ Récupère la liste des matchs (paginée)
   */
  public async getMatches(params?: { page?: number; limit?: number; search?: string }): Promise<Match[]> {
    const res = await this.client.get('/matches', { params });
    return res.data;
  }

  /**
   * ⚽ Récupère le détail complet d'un match avec les stats des joueurs
   */
  public async getMatch(id: string): Promise<
    Match & {
      competition: Competition;
      league: League;
      playerStats: (PlayerMatchStats & { player: Player; team: Team })[];
    }
  > {
    const res = await this.client.get(`/matches/${id}`);
    return res.data;
  }

  /**
   * ⚡ Récupère l'état actuel de la file d'attente BullMQ
   */
  public async getSyncQueue(): Promise<SyncQueueState> {
    const res = await this.client.get('/sync/queue');
    return res.data;
  }

  /**
   * ⚡ Déclenche une synchronisation asynchrone pour un coach spécifique
   */
  public async syncCoach(id: string): Promise<{ success: boolean; jobId: string }> {
    const res = await this.client.post(`/sync/coach/${id}`);
    return res.data;
  }

  /**
   * ⚡ Déclenche une synchronisation asynchrone pour une ligue spécifique
   */
  public async syncLeague(id: string): Promise<{ success: boolean; jobId: string }> {
    const res = await this.client.post(`/sync/league/${id}`);
    return res.data;
  }

  /**
   * 📊 Récupère les statistiques globales
   */
  public async getGlobalStats(): Promise<GlobalStats> {
    const res = await this.client.get('/stats/global');
    return res.data;
  }

  /**
   * 📊 Récupère l'activité récente (ex: matchs par jour)
   */
  public async getActivityStats(): Promise<any> {
    const res = await this.client.get('/stats/activity');
    return res.data;
  }

  /**
   * 📊 Récupère les statistiques agrégées de performance pour un coach
   */
  public async getCoachStats(id: string): Promise<any> {
    const res = await this.client.get(`/stats/coach/${id}`);
    return res.data;
  }

  /**
   * 📊 Récupère les statistiques de performance pour une compétition
   */
  public async getCompetitionStats(id: string): Promise<any> {
    const res = await this.client.get(`/stats/competition/${id}`);
    return res.data;
  }

  /**
   * 📊 Récupère les statistiques globales pour une ligue
   */
  public async getLeagueStats(id: string): Promise<any> {
    const res = await this.client.get(`/stats/league/${id}`);
    return res.data;
  }
}
