/**
 * Fichier : src/components/widgets/WidgetWinrateParRencontre/index.tsx
 * Description : Widget réutilisable affichant la matrice double-entrée des taux de victoire entre rosters.
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { getRaceInfo } from '../../../utils/raceHelper';

interface TeamInfo {
  raceId: number;
  name?: string;
}

interface MinimalMatch {
  homeScore: number;
  awayScore: number;
  homeTeam?: TeamInfo | null;
  awayTeam?: TeamInfo | null;
  homeRaceId?: number; // fallback direct
  awayRaceId?: number; // fallback direct
}

export interface WidgetWinrateParRencontreProps {
  matches: MinimalMatch[];
}

export const WidgetWinrateParRencontre: React.FC<WidgetWinrateParRencontreProps> = ({ matches }) => {
  // 1. Extraire les rosters uniques et calculer les face-à-face
  const statsMap: Record<string, { wins: number; draws: number; losses: number }> = {};
  const uniqueRacesSet = new Set<number>();

  matches.forEach(m => {
    const raceHome = m.homeRaceId ?? m.homeTeam?.raceId;
    const raceAway = m.awayRaceId ?? m.awayTeam?.raceId;

    if (raceHome === undefined || raceAway === undefined) return;

    uniqueRacesSet.add(raceHome);
    uniqueRacesSet.add(raceAway);

    const keyHome = `${raceHome}-${raceAway}`;
    const keyAway = `${raceAway}-${raceHome}`;

    if (!statsMap[keyHome]) statsMap[keyHome] = { wins: 0, draws: 0, losses: 0 };
    if (!statsMap[keyAway]) statsMap[keyAway] = { wins: 0, draws: 0, losses: 0 };

    if (m.homeScore > m.awayScore) {
      statsMap[keyHome].wins++;
      statsMap[keyAway].losses++;
    } else if (m.homeScore === m.awayScore) {
      statsMap[keyHome].draws++;
      statsMap[keyAway].draws++;
    } else {
      statsMap[keyHome].losses++;
      statsMap[keyAway].wins++;
    }
  });

  const uniqueRaces = Array.from(uniqueRacesSet).sort((a, b) => a - b);

  // Fonction pour obtenir la couleur de fond en fonction du winrate
  const getCellBg = (winrate: number, total: number) => {
    if (total === 0) return 'rgba(255,255,255,0.02)';
    if (winrate > 55) {
      // Vert néon transparent
      return `rgba(0, 230, 118, ${Math.min(0.05 + (winrate - 50) / 100, 0.25)})`;
    } else if (winrate < 45) {
      // Rouge/orange néon transparent
      return `rgba(255, 61, 0, ${Math.min(0.05 + (50 - winrate) / 100, 0.25)})`;
    }
    // Slate/bleu sombre transparent
    return 'rgba(148, 163, 184, 0.04)';
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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
        Matrice des Matchups (% Winrate)
      </Typography>

      {uniqueRaces.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Aucun affrontement enregistré pour le moment.
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 500, border: '1px solid rgba(148, 163, 184, 0.06)', borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: '#0F172A', fontWeight: 800, fontSize: '0.75rem', zIndex: 3 }}>
                  ROSTER (Ligne)
                </TableCell>
                {uniqueRaces.map(raceId => {
                  const info = getRaceInfo(raceId);
                  return (
                    <TableCell
                      key={`col-${raceId}`}
                      align="center"
                      sx={{
                        bgcolor: '#0F172A',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        minWidth: 70,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <Tooltip title={info.name}>
                        <span>{info.emoji} {info.name.slice(0, 3)}.</span>
                      </Tooltip>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {uniqueRaces.map(rowRaceId => {
                const rowInfo = getRaceInfo(rowRaceId);
                return (
                  <TableRow key={`row-${rowRaceId}`} hover>
                    <TableCell
                      sx={{
                        bgcolor: '#151D30',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        borderRight: '1px solid rgba(148, 163, 184, 0.06)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rowInfo.emoji} {rowInfo.name}
                    </TableCell>
                    {uniqueRaces.map(colRaceId => {
                      if (rowRaceId === colRaceId) {
                        return (
                          <TableCell
                            key={`cell-${rowRaceId}-${colRaceId}`}
                            align="center"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.03)',
                              color: '#475569',
                              fontSize: '0.7rem',
                            }}
                          >
                            -
                          </TableCell>
                        );
                      }

                      const stats = statsMap[`${rowRaceId}-${colRaceId}`] || { wins: 0, draws: 0, losses: 0 };
                      const total = stats.wins + stats.draws + stats.losses;
                      const winrate = total > 0 ? (stats.wins / total) * 100 : 0;

                      return (
                        <Tooltip
                          key={`tooltip-${rowRaceId}-${colRaceId}`}
                          title={`${rowInfo.name} vs ${getRaceInfo(colRaceId).name} : ${winrate.toFixed(1)}% (${stats.wins}V / ${stats.draws}N / ${stats.losses}D, ${total}m)`}
                          arrow
                        >
                          <TableCell
                            align="center"
                            sx={{
                              bgcolor: getCellBg(winrate, total),
                              color: total > 0 ? '#F8FAFC' : '#475569',
                              fontWeight: total > 0 ? 800 : 400,
                              fontSize: '0.75rem',
                              cursor: 'help',
                              borderRight: '1px solid rgba(148, 163, 184, 0.04)',
                            }}
                          >
                            {total > 0 ? `${winrate.toFixed(0)}%` : 'N/A'}
                          </TableCell>
                        </Tooltip>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
