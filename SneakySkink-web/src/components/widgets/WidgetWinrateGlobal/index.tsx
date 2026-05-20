/**
 * Fichier : src/components/widgets/WidgetWinrateGlobal/index.tsx
 * Description : Widget réutilisable affichant le taux de victoire global (V/N/D et pourcentage).
 */

import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';

export interface WidgetWinrateGlobalProps {
  wins: number;
  draws: number;
  losses: number;
}

export const WidgetWinrateGlobal: React.FC<WidgetWinrateGlobalProps> = ({
  wins,
  draws,
  losses,
}) => {
  const total = wins + draws + losses;
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
          Taux de Victoire
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#00E676', letterSpacing: '-0.02em' }}>
          {winrate}%
        </Typography>
      </Box>

      {/* Ratio Bar */}
      <Box sx={{ height: 8, display: 'flex', borderRadius: 99, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)', my: 0.5 }}>
        <Box sx={{ width: `${total > 0 ? (wins / total) * 100 : 33.3}%`, bgcolor: '#00E676', transition: 'width 0.8s ease' }} />
        <Box sx={{ width: `${total > 0 ? (draws / total) * 100 : 33.3}%`, bgcolor: '#94A3B8', transition: 'width 0.8s ease' }} />
        <Box sx={{ width: `${total > 0 ? (losses / total) * 100 : 33.3}%`, bgcolor: '#FF3D00', transition: 'width 0.8s ease' }} />
      </Box>

      {/* Stats Details */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography sx={{ color: '#00E676', fontWeight: 800, fontSize: '1.2rem' }}>{wins}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>VICTOIRES</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1, borderLeft: '1px solid rgba(148,163,184,0.08)', borderRight: '1px solid rgba(148,163,184,0.08)' }}>
          <Typography sx={{ color: '#94A3B8', fontWeight: 800, fontSize: '1.2rem' }}>{draws}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>NULS</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', flex: 1 }}>
          <Typography sx={{ color: '#FF3D00', fontWeight: 800, fontSize: '1.2rem' }}>{losses}</Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>DÉFAITES</Typography>
        </Box>
      </Box>
    </Paper>
  );
};
