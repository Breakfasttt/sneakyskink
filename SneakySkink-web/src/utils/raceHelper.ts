export interface RaceInfo {
  name: string;
  emoji: string;
  color: string; // HEX color matching the race theme
}

const racesMap: Record<number, RaceInfo> = {
  1: { name: 'Humains', emoji: '🛡️', color: '#1E3A8A' },
  2: { name: 'Nains', emoji: '🧔', color: '#B45309' },
  3: { name: 'Skavens', emoji: '🐀', color: '#6B7280' },
  4: { name: 'Orcs', emoji: '🪓', color: '#047857' },
  5: { name: 'Hommes-Lézards', emoji: '🦎', color: '#00E676' },
  6: { name: 'Gobelins', emoji: '💥', color: '#10B981' },
  7: { name: 'Elfes Sylvains', emoji: '🍃', color: '#15803D' },
  8: { name: 'Élus du Chaos', emoji: '🔥', color: '#DC2626' },
  9: { name: 'Elfes Noirs', emoji: '🔮', color: '#6D28D9' },
  10: { name: 'Morts-Vivants', emoji: '💀', color: '#059669' },
  11: { name: 'Halflings', emoji: '🥧', color: '#F59E0B' },
  12: { name: 'Amazones', emoji: '🏹', color: '#059669' },
  13: { name: 'Vampires', emoji: '🧛', color: '#991B1B' },
  14: { name: 'Union Elfique', emoji: '✨', color: '#60A5FA' },
  15: { name: 'Nordiques', emoji: '❄️', color: '#38BDF8' },
  16: { name: 'Nains du Chaos', emoji: '🌋', color: '#451A03' },
  17: { name: 'Nécromantiques', emoji: '🧟', color: '#8B5CF6' },
  18: { name: 'Nurgle', emoji: '🤮', color: '#4D7C0F' },
  22: { name: 'Bas-Fonds', emoji: '🍄', color: '#4B5563' },
  23: { name: 'Khorne', emoji: '🩸', color: '#7F1D1D' },
  24: { name: 'Noblesse Impériale', emoji: '⚜️', color: '#D97706' },
  1000: { name: 'Orques Noirs', emoji: '🐗', color: '#1B4332' },
  1001: { name: 'Renégats du Chaos', emoji: '⚡', color: '#7C3AED' },
  1002: { name: 'Alliance du Vieux Monde', emoji: '🏰', color: '#2563EB' },
};

export const getRaceInfo = (raceId: number): RaceInfo => {
  return racesMap[raceId] || { name: `Race #${raceId}`, emoji: '🏈', color: '#94A3B8' };
};
