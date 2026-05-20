/**
 * Fichier : src/components/widgets/WidgetWinrateDetails/index.tsx
 * Description : Widget réutilisable sous forme de tableau triable affichant le détail des winrates par roster joué.
 */

import React, { useState } from 'react';
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
} from '@mui/material';
import { getRaceInfo } from '../../../utils/raceHelper';

export interface RosterWinrateDetail {
  raceId: number;
  matchesCount: number;
  wins: number;
  draws: number;
  losses: number;
}

export interface WidgetWinrateDetailsProps {
  data: RosterWinrateDetail[];
}

type Order = 'asc' | 'desc';

export const WidgetWinrateDetails: React.FC<WidgetWinrateDetailsProps> = ({ data }) => {
  const [order, setOrder] = useState<Order>('desc');
  const [orderBy, setOrderBy] = useState<keyof RosterWinrateDetail | 'winrate' | 'raceName'>('matchesCount');

  // Enrichir les données avec le winrate calculé et le nom de la race pour le tri
  const enrichedData = data.map(item => {
    const info = getRaceInfo(item.raceId);
    const winrate = item.matchesCount > 0 ? (item.wins / item.matchesCount) * 100 : 0;
    return {
      ...item,
      raceName: info.name,
      emoji: info.emoji,
      color: info.color,
      winrate: Number(winrate.toFixed(1)),
    };
  });

  const handleRequestSort = (property: typeof orderBy) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Algorithme de tri
  const sortedData = [...enrichedData].sort((a, b) => {
    let aVal: any = a[orderBy as keyof typeof a];
    let bVal: any = b[orderBy as keyof typeof b];

    if (aVal === undefined) aVal = 0;
    if (bVal === undefined) bVal = 0;

    if (typeof aVal === 'string') {
      return order === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const headers = [
    { id: 'raceName' as const, label: 'Roster', align: 'left' as const },
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
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
        Détails du Winrate par Roster
      </Typography>

      {sortedData.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>Aucune donnée disponible</Typography>
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
