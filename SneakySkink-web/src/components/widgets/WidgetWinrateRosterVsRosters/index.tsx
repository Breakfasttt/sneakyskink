/**
 * Fichier : src/components/widgets/WidgetWinrateRosterVsRosters/index.tsx
 * Description : Widget réutilisable affichant le winrate détaillé face aux rosters adverses pour un roster sélectionné.
 */

import React, { useState, useMemo } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Box,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import { getRaceInfo } from '../../../utils/raceHelper';

interface TeamInfo {
  raceId: number;
}

interface MinimalMatch {
  id: string;
  homeCoachId?: string | null;
  awayCoachId?: string | null;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  homeTeam?: TeamInfo | null;
  awayTeam?: TeamInfo | null;
  homeRaceId?: number;
  awayRaceId?: number;
}

export interface WidgetWinrateRosterVsRostersProps {
  matches: MinimalMatch[];
  focusId: string; // ID du coach ou de l'équipe ciblée
}

type Order = 'asc' | 'desc';

interface OpponentStat {
  raceId: number;
  raceName: string;
  emoji: string;
  color: string;
  matchesCount: number;
  wins: number;
  draws: number;
  losses: number;
  winrate: number;
}

export const WidgetWinrateRosterVsRosters: React.FC<WidgetWinrateRosterVsRostersProps> = ({
  matches,
  focusId,
}) => {
  const [selectedRaceId, setSelectedRaceId] = useState<number | ''>('');
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof OpponentStat>('matchesCount');

  // 1. Déterminer tous les rosters joués par le focusId
  const focusRaces = useMemo(() => {
    const races = new Set<number>();
    matches.forEach(m => {
      const isHome = m.homeCoachId === focusId || m.homeTeamId === focusId;
      const isAway = m.awayCoachId === focusId || m.awayTeamId === focusId;
      if (isHome) {
        const race = m.homeRaceId ?? m.homeTeam?.raceId;
        if (race !== undefined) races.add(race);
      } else if (isAway) {
        const race = m.awayRaceId ?? m.awayTeam?.raceId;
        if (race !== undefined) races.add(race);
      }
    });
    const result = Array.from(races).sort((a, b) => a - b);
    
    // Auto-sélectionner le premier roster s'il y en a et aucun n'est sélectionné
    if (result.length > 0 && selectedRaceId === '') {
      setSelectedRaceId(result[0]);
    }
    return result;
  }, [matches, focusId, selectedRaceId]);

  // 2. Calculer les statistiques contre les autres rosters pour le roster sélectionné
  const opponentStats = useMemo(() => {
    if (selectedRaceId === '') return [];

    const stats: Record<number, { wins: number; draws: number; losses: number }> = {};

    matches.forEach(m => {
      const isHome = m.homeCoachId === focusId || m.homeTeamId === focusId;
      const isAway = m.awayCoachId === focusId || m.awayTeamId === focusId;

      if (!isHome && !isAway) return;

      const myRace = isHome ? (m.homeRaceId ?? m.homeTeam?.raceId) : (m.awayRaceId ?? m.awayTeam?.raceId);
      const oppRace = isHome ? (m.awayRaceId ?? m.awayTeam?.raceId) : (m.homeRaceId ?? m.homeTeam?.raceId);

      // Ne prendre en compte que si j'ai joué le roster sélectionné
      if (myRace !== selectedRaceId || oppRace === undefined) return;

      if (!stats[oppRace]) {
        stats[oppRace] = { wins: 0, draws: 0, losses: 0 };
      }

      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (myScore > oppScore) {
        stats[oppRace].wins++;
      } else if (myScore === oppScore) {
        stats[oppRace].draws++;
      } else {
        stats[oppRace].losses++;
      }
    });

    return Object.entries(stats).map(([oppRaceStr, counts]) => {
      const oppRaceId = Number(oppRaceStr);
      const info = getRaceInfo(oppRaceId);
      const total = counts.wins + counts.draws + counts.losses;
      const winrate = total > 0 ? (counts.wins / total) * 100 : 0;
      return {
        raceId: oppRaceId,
        raceName: info.name,
        emoji: info.emoji,
        color: info.color,
        matchesCount: total,
        wins: counts.wins,
        draws: counts.draws,
        losses: counts.losses,
        winrate: Number(winrate.toFixed(1)),
      };
    });
  }, [matches, focusId, selectedRaceId]);

  const handleRequestSort = (property: keyof OpponentStat) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortedData = useMemo(() => {
    return [...opponentStats].sort((a, b) => {
      let aVal = a[orderBy];
      let bVal = b[orderBy];

      if (typeof aVal === 'string') {
        const bValStr = bVal as string;
        return order === 'asc' ? aVal.localeCompare(bValStr) : bValStr.localeCompare(aVal);
      }

      const aValNum = aVal as number;
      const bValNum = bVal as number;
      return order === 'asc' ? aValNum - bValNum : bValNum - aValNum;
    });
  }, [opponentStats, order, orderBy]);

  const headers = [
    { id: 'raceName' as const, label: 'Adversaire', align: 'left' as const },
    { id: 'matchesCount' as const, label: 'Matchs', align: 'right' as const },
    { id: 'winrate' as const, label: 'Winrate', align: 'right' as const },
    { id: 'wins' as const, label: 'V', align: 'right' as const },
    { id: 'draws' as const, label: 'N', align: 'right' as const },
    { id: 'losses' as const, label: 'D', align: 'right' as const },
  ];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid rgba(148, 163, 184, 0.08)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Face-à-Face par Roster Joué
        </Typography>

        {focusRaces.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="roster-select-label" sx={{ color: '#64748B', '&.Mui-focused': { color: '#00E676' } }}>Roster à analyser</InputLabel>
            <Select
              labelId="roster-select-label"
              value={selectedRaceId}
              label="Roster à analyser"
              onChange={(e) => setSelectedRaceId(Number(e.target.value))}
              sx={{
                color: '#F8FAFC',
                bgcolor: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 2,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(148, 163, 184, 0.15)',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(0, 230, 118, 0.3)',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#00E676',
                },
              }}
            >
              {focusRaces.map(raceId => {
                const info = getRaceInfo(raceId);
                return (
                  <MenuItem key={raceId} value={raceId}>
                    {info.emoji} {info.name}
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
        )}
      </Box>

      {focusRaces.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>Aucun match à analyser</Typography>
        </Box>
      ) : sortedData.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>Choisissez un roster pour charger les affrontements</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ border: '1px solid rgba(148, 163, 184, 0.06)', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {headers.map(head => (
                  <TableCell
                    key={head.id}
                    align={head.align}
                    sortDirection={orderBy === head.id ? order : false}
                    sx={{ bgcolor: '#0F172A', py: 1.5 }}
                  >
                    <TableSortLabel
                      active={orderBy === head.id}
                      direction={orderBy === head.id ? order : 'asc'}
                      onClick={() => handleRequestSort(head.id)}
                      sx={{
                        color: '#94A3B8 !important',
                        fontWeight: 800,
                        fontSize: '0.75rem',
                        '& .MuiTableSortLabel-icon': {
                          color: '#00E676 !important',
                        },
                      }}
                    >
                      {head.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedData.map((row, idx) => (
                <TableRow key={idx} hover sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span style={{ color: row.color }}>{row.emoji}</span>
                    <span>{row.raceName}</span>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem', color: '#F8FAFC' }}>
                    {row.matchesCount}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.8rem', color: '#00E676' }}>
                    {row.winrate}%
                  </TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#00E676', fontWeight: 600 }}>{row.wins}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#94A3B8', fontWeight: 600 }}>{row.draws}</TableCell>
                  <TableCell align="right" sx={{ fontSize: '0.8rem', color: '#FF3D00', fontWeight: 600 }}>{row.losses}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};
