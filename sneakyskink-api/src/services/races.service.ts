/**
 * Service pour la gestion des races (factions) de Blood Bowl 3.
 * Fournit le dictionnaire officiel aligné sur les identifiants de l'API de Cyanide.
 */

export interface Race {
  id: number;
  name: string;
  codename: string;
  emoji: string;
  color: string;
}

export class RacesService {
  private static readonly RACES: Race[] = [
    { id: 1, name: 'Humains', codename: 'human', emoji: '🛡️', color: '#1E3A8A' },
    { id: 2, name: 'Nains', codename: 'dwarf', emoji: '🧔', color: '#B45309' },
    { id: 3, name: 'Skavens', codename: 'skaven', emoji: '🐀', color: '#6B7280' },
    { id: 4, name: 'Orcs', codename: 'orc', emoji: '🪓', color: '#047857' },
    { id: 5, name: 'Hommes-Lézards', codename: 'lizardman', emoji: '🦎', color: '#00E676' },
    { id: 6, name: 'Gobelins', codename: 'goblin', emoji: '💥', color: '#10B981' },
    { id: 7, name: 'Elfes Sylvains', codename: 'woodElf', emoji: '🍃', color: '#15803D' },
    { id: 8, name: 'Élus du Chaos', codename: 'chaosChosen', emoji: '🔥', color: '#DC2626' },
    { id: 9, name: 'Elfes Noirs', codename: 'darkElf', emoji: '🔮', color: '#6D28D9' },
    { id: 10, name: 'Morts-Vivants', codename: 'shamblingUndead', emoji: '💀', color: '#059669' },
    { id: 11, name: 'Halflings', codename: 'halfling', emoji: '🥧', color: '#F59E0B' },
    { id: 12, name: 'Amazones', codename: 'amazon', emoji: '🏹', color: '#059669' },
    { id: 13, name: 'Vampires', codename: 'vampire', emoji: '🧛', color: '#991B1B' },
    { id: 14, name: 'Union Elfique', codename: 'elvenUnion', emoji: '✨', color: '#60A5FA' },
    { id: 15, name: 'Nordiques', codename: 'norse', emoji: '❄️', color: '#38BDF8' },
    { id: 16, name: 'Nains du Chaos', codename: 'chaosDwarf', emoji: '🌋', color: '#451A03' },
    { id: 17, name: 'Nécromantiques', codename: 'necromanticHorror', emoji: '🧟', color: '#8B5CF6' },
    { id: 18, name: 'Nurgle', codename: 'nurgle', emoji: '🤮', color: '#4D7C0F' },
    { id: 22, name: 'Bas-Fonds', codename: 'underworldDenizens', emoji: '🍄', color: '#4B5563' },
    { id: 23, name: 'Khorne', codename: 'khorne', emoji: '🩸', color: '#7F1D1D' },
    { id: 24, name: 'Noblesse Impériale', codename: 'imperialNobility', emoji: '⚜️', color: '#D97706' },
    { id: 1000, name: 'Orques Noirs', codename: 'blackOrc', emoji: '🐗', color: '#1B4332' },
    { id: 1001, name: 'Renégats du Chaos', codename: 'chaosRenegade', emoji: '⚡', color: '#7C3AED' },
    { id: 1002, name: 'Alliance du Vieux Monde', codename: 'oldWorldAlliance', emoji: '🏰', color: '#2563EB' }
  ];

  /**
   * Retourne la liste complète de toutes les races supportées.
   */
  public static getAll(): Race[] {
    return this.RACES;
  }

  /**
   * Trouve une race par son identifiant unique.
   * @param id Identifiant de la race
   */
  public static getById(id: number): Race | undefined {
    return this.RACES.find(race => race.id === id);
  }
}
