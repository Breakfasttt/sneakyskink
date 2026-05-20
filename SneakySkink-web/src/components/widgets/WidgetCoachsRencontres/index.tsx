/**
 * Fichier : src/components/widgets/WidgetCoachsRencontres/index.tsx
 * Description : Widget réutilisable sous forme de tableau triable affichant la liste des coachs rencontrés et filtrable par première lettre.
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

interface CoachInfo {
  id?: string;
  name: string;
}

interface MinimalMatch {
  homeCoachId?: string | null;
  awayCoachId?: string | null;
  homeCoach?: CoachInfo | null;
  awayCoach?: CoachInfo | null;
  homeScore: number;
  awayScore: number;
}

export interface WidgetCoachsRencontresProps {
  matches: MinimalMatch[];
  focusCoachId: string; // ID du coach dont on analyse l'historique
}

type Order = 'asc' | 'desc';

interface CoachOpponentStat {
  coachName: string;
  matchesCount: number;
  wins: number;
  draws: number;
  losses: number;
  winrate: number;
}

export const WidgetCoachsRencontres: React.FC<WidgetCoachsRencontresProps> = ({
  matches,
  focusCoachId,
}) => {
  const [selectedLetter, setSelectedLetter] = useState<string>('TOUS');
  const [order, setOrder] = useState<Order>('asc');
  const [orderBy, setOrderBy] = useState<keyof CoachOpponentStat>('coachName');

  // 1. Extraire les face-à-face
  const coachStats = useMemo(() => {
    const stats: Record<string, { wins: number; draws: number; losses: number }> = {};

    matches.forEach(m => {
      const isHome = m.homeCoachId === focusCoachId;
      const isAway = m.awayCoachId === focusCoachId;

      if (!isHome && !isAway) return;

      const opponentCoach = isHome ? m.awayCoach : m.homeCoach;
      const opponentCoachId = isHome ? m.awayCoachId : m.homeCoachId;

      // Ignorer si pas d'adversaire humain enregistré
      if (!opponentCoach || !opponentCoachId) return;

      const oppName = opponentCoach.name;

      if (!stats[oppName]) {
        stats[oppName] = { wins: 0, draws: 0, losses: 0 };
      }

      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;

      if (myScore > oppScore) {
        stats[oppName].wins++;
      } else if (myScore === oppScore) {
        stats[oppName].draws++;
      } else {
        stats[oppName].losses++;
      }
    });

    return Object.entries(stats).map(([oppName, counts]) => {
      const total = counts.wins + counts.draws + counts.losses;
      const winrate = total > 0 ? (counts.wins / total) * 100 : 0;
      return {
        coachName: oppName,
        matchesCount: total,
        wins: counts.wins,
        draws: counts.draws,
        losses: counts.losses,
        winrate: Number(winrate.toFixed(1)),
      };
    });
  }, [matches, focusCoachId]);

  // 2. Extraire toutes les lettres initiales disponibles pour filtrer
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    coachStats.forEach(c => {
      if (c.coachName && c.coachName.length > 0) {
        letters.add(c.coachName.charAt(0).toUpperCase());
      }
    });
    return Array.from(letters).sort();
  }, [coachStats]);

  // 3. Filtrer par lettre
  const filteredStats = useMemo(() => {
    if (selectedLetter === 'TOUS') return coachStats;
    return coachStats.filter(c => c.coachName.charAt(0).toUpperCase() === selectedLetter);
  }, [coachStats, selectedLetter]);

  // 4. Trier les données
  const sortedData = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
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
  }, [filteredStats, order, orderBy]);

  const handleRequestSort = (property: keyof CoachOpponentStat) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const headers = [
    { id: 'coachName' as const, label: 'Coach adverse', align: 'left' as const },
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
          Coachs Déjà Rencontrés
        </Typography>

        {availableLetters.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="letter-select-label" sx={{ color: '#64748B', '&.Mui-focused': { color: '#00E676' } }}>Première lettre</InputLabel>
            <Select
              labelId="letter-select-label"
              value={selectedLetter}
              label="Première lettre"
              onChange={(e) => setSelectedLetter(e.target.value)}
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
              <MenuItem value="TOUS">Toutes</MenuItem>
              {availableLetters.map(letter => (
                <MenuItem key={letter} value={letter}>
                  {letter}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {coachStats.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>Aucun coach rencontré</Typography>
        </Box>
      ) : sortedData.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#64748B' }}>Aucun coach commençant par la lettre "{selectedLetter}"</Typography>
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
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#F8FAFC' }}>
                    {row.coachName}
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
