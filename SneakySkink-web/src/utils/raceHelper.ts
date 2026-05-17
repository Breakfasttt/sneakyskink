export interface RaceInfo {
  name: string;
  emoji: string;
  color: string; // HEX color matching the race theme
}

const racesMap: Record<number, RaceInfo> = {
  1: { name: 'Humains', emoji: '🛡️', color: '#1E3A8A' },
  2: { name: 'Orcs', emoji: '🪓', color: '#047857' },
  3: { name: 'Nains', emoji: '🧔', color: '#B45309' },
  4: { name: 'Skavens', emoji: '🐀', color: '#6B7280' },
  5: { name: 'Hauts Elfes', emoji: '✨', color: '#60A5FA' },
  6: { name: 'Elfes Noirs', emoji: '🔮', color: '#6D28D9' },
  7: { name: 'Morts-Vivants', emoji: '💀', color: '#059669' },
  8: { name: 'Hommes-Lézards', emoji: '🦎', color: '#00E676' }, // Skink theme color!
  9: { name: 'Élus du Chaos', emoji: '🔥', color: '#DC2626' },
  10: { name: 'Orques Noirs', emoji: '🐗', color: '#1B4332' },
  11: { name: 'Noblesse Impériale', emoji: '⚜️', color: '#D97706' },
  12: { name: 'Amazones', emoji: '🏹', color: '#059669' },
  13: { name: 'Nordiques', emoji: '❄️', color: '#38BDF8' },
  14: { name: 'Renégats du Chaos', emoji: '⚡', color: '#7C3AED' },
  15: { name: 'Alliance du Vieux Monde', emoji: '🏰', color: '#2563EB' },
  16: { name: 'Bas-Fonds', emoji: '🍄', color: '#4B5563' },
  17: { name: 'Gobelins', emoji: '💥', color: '#10B981' },
  18: { name: 'Nurgle', emoji: '🤮', color: '#4D7C0F' },
  19: { name: 'Halflings', emoji: '🥧', color: '#F59E0B' },
  20: { name: 'Elfes Sylvains', emoji: '🍃', color: '#15803D' },
  21: { name: 'Nécromantiques', emoji: '🧟', color: '#8B5CF6' },
  22: { name: 'Rois des Tombes', emoji: '🏺', color: '#CA8A04' },
  23: { name: 'Vampires', emoji: '🧛', color: '#991B1B' },
  24: { name: 'Khorne', emoji: '🩸', color: '#7F1D1D' },
  25: { name: 'Nains du Chaos', emoji: '🌋', color: '#451A03' },
  26: { name: 'Slanns', emoji: '🐸', color: '#22C55E' },
};

export const getRaceInfo = (raceId: number): RaceInfo => {
  return racesMap[raceId] || { name: `Race #${raceId}`, emoji: '🏈', color: '#94A3B8' };
};
