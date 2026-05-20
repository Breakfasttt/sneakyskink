/**
 * Fichier : src/components/widgets/WidgetEvolutionWinrate/index.tsx
 * Description : Widget réutilisable affichant l'évolution historique du taux de victoire sous forme de courbe (basée sur les X derniers matchs).
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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

export interface WidgetEvolutionWinrateProps {
  matches: MinimalMatch[];
  focusId: string;
  limit?: number; // Nombre max de points à afficher sur le graphique (défaut : 40)
}

export const WidgetEvolutionWinrate: React.FC<WidgetEvolutionWinrateProps> = ({
  matches,
  focusId,
  limit = 40,
}) => {
  // 1. Filtrer les matchs impliquant l'entité et trier par date chronologique (du plus ancien au plus récent)
  const sortedMatches = [...matches]
    .filter(m =>
      m.homeCoachId === focusId ||
      m.awayCoachId === focusId ||
      m.homeTeamId === focusId ||
      m.awayTeamId === focusId
    )
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  // 2. Calculer le taux de victoire cumulé à chaque étape
  let runningWins = 0;
  let runningTotal = 0;

  const evolutionPoints = sortedMatches.map((match, idx) => {
    const isHome = match.homeCoachId === focusId || match.homeTeamId === focusId;
    const myScore = isHome ? match.homeScore : match.awayScore;
    const oppScore = isHome ? match.awayScore : match.homeScore;

    runningTotal++;
    if (myScore > oppScore) {
      runningWins++;
    }

    const currentWinrate = (runningWins / runningTotal) * 100;

    return {
      matchIndex: idx + 1,
      winrate: Number(currentWinrate.toFixed(1)),
      score: `${myScore}-${oppScore}`,
      outcome: myScore > oppScore ? 'Victoire' : myScore === oppScore ? 'Nul' : 'Défaite',
    };
  });

  // Ne garder que les "limit" derniers points d'évolution
  const chartData = evolutionPoints.slice(-limit);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <Box
          sx={{
            bgcolor: '#0F172A',
            border: '1px solid rgba(148,163,184,0.15)',
            p: 1.5,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 0.5 }}>
            Match #{d.matchIndex} ({d.outcome} {d.score})
          </Typography>
          <Typography variant="body2" sx={{ color: '#00E676', fontWeight: 800 }}>
            Winrate cumulé : {d.winrate}%
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid rgba(148, 163, 184, 0.08)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)',
        backdropFilter: 'blur(12px)',
        height: '100%',
        minHeight: 280,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 3 }}>
        Évolution du Winrate (Derniers {limit} Matchs)
      </Typography>

      {chartData.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>Aucun match enregistré</Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: 200, minWidth: 0 }}>
          <ResponsiveContainer width="99%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.04)" vertical={false} />
              <XAxis dataKey="matchIndex" stroke="#475569" fontSize={9} tickLine={false} />
              <YAxis stroke="#475569" fontSize={9} tickLine={false} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="winrate"
                stroke="#00E676"
                strokeWidth={2.5}
                dot={{ r: 2, stroke: '#00E676', strokeWidth: 1, fill: '#0B0F19' }}
                activeDot={{ r: 5, stroke: '#00E676', strokeWidth: 1, fill: '#00E676' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};
