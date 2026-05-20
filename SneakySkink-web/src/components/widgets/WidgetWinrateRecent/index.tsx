/**
 * Fichier : src/components/widgets/WidgetWinrateRecent/index.tsx
 * Description : Widget réutilisable affichant le taux de victoire récent sur les X derniers matchs.
 */

import React from 'react';
import { Box, Typography, Paper, Tooltip } from '@mui/material';

// Typage minimal du match importé indirectement de sneakyskink-bdd/client
interface MinimalMatch {
  id: string;
  startedAt: string | Date;
  homeCoachId?: string | null;
  awayCoachId?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface WidgetWinrateRecentProps {
  matches: MinimalMatch[];
  focusId: string; // ID du coach ou de l'équipe ciblée
  limit?: number; // Nombre de matchs récents à analyser (défaut : 10)
}

export const WidgetWinrateRecent: React.FC<WidgetWinrateRecentProps> = ({
  matches,
  focusId,
  limit = 10,
}) => {
  // Trier par date décroissante pour avoir les plus récents en premier
  const sortedMatches = [...matches]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, limit);

  let wins = 0;
  let draws = 0;
  let losses = 0;

  // Calculer les résultats pour chaque match
  const outcomes = sortedMatches.map(match => {
    const isHome = match.homeCoachId === focusId || match.homeTeamId === focusId;
    const isAway = match.awayCoachId === focusId || match.awayTeamId === focusId;

    if (!isHome && !isAway) return null;

    const myScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;

    if (myScore > oppScore) {
      wins++;
      return { result: 'W', color: '#00E676', label: 'Victoire', score: `${myScore} - ${oppScore}` };
    } else if (myScore === oppScore) {
      draws++;
      return { result: 'D', color: '#94A3B8', label: 'Nul', score: `${myScore} - ${oppScore}` };
    } else {
      losses++;
      return { result: 'L', color: '#FF3D00', label: 'Défaite', score: `${myScore} - ${oppScore}` };
    }
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const total = outcomes.length;
  const winrate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid rgba(148, 163, 184, 0.08)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Sur les {limit} derniers matchs
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#00E676', letterSpacing: '-0.02em' }}>
          {winrate}%
        </Typography>
      </Box>

      {/* Outcome Dot Sequence */}
      <Box sx={{ display: 'flex', gap: 1, my: 0.5, flexWrap: 'wrap' }}>
        {outcomes.length === 0 ? (
          <Typography variant="caption" sx={{ color: '#475569' }}>
            Aucun match récent
          </Typography>
        ) : (
          // Inverser pour afficher chronologiquement de gauche à droite
          [...outcomes].reverse().map((outcome, idx) => (
            <Tooltip key={idx} title={`${outcome.label} (${outcome.score})`} arrow>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  bgcolor: 'rgba(21, 29, 48, 0.6)',
                  border: `1px solid ${outcome.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: `0 0 8px ${outcome.color}15`,
                  '&:hover': {
                    transform: 'scale(1.15)',
                    boxShadow: `0 0 12px ${outcome.color}40`,
                  },
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: outcome.color,
                    fontWeight: 800,
                    fontSize: '0.75rem',
                  }}
                >
                  {outcome.result}
                </Typography>
              </Box>
            </Tooltip>
          ))
        )}
      </Box>

      {/* W-D-L counts */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid rgba(148,163,184,0.06)' }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
          BILAN RECENT : <span style={{ color: '#00E676', fontWeight: 800 }}>{wins} V</span> · <span style={{ color: '#94A3B8', fontWeight: 800 }}>{draws} N</span> · <span style={{ color: '#FF3D00', fontWeight: 800 }}>{losses} D</span>
        </Typography>
      </Box>
    </Paper>
  );
};
