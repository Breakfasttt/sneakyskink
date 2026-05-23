/**
 * Fichier : src/components/widgets/WidgetMatchsSur24h/index.tsx
 * Description : Widget premium affichant le nombre de matchs joués sur les dernières 24 heures glissantes.
 */

import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import {
  AccessTime as TimeIcon,
  SportsSoccer as MatchIcon,
  TrendingUp as TrendIcon,
} from '@mui/icons-material';

export interface WidgetMatchsSur24hProps {
  matches24h: { startedAt: string | Date }[];
  loading?: boolean;
}

export const WidgetMatchsSur24h: React.FC<WidgetMatchsSur24hProps> = ({ matches24h, loading = false }) => {
  const count = matches24h?.length ?? 0;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid rgba(0, 230, 118, 0.15)',
        background: 'linear-gradient(135deg, rgba(0, 230, 118, 0.04) 0%, rgba(15, 23, 42, 0.2) 100%)',
        backdropFilter: 'blur(12px)',
        height: '100%',
        minHeight: 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 32px rgba(0, 230, 118, 0.08)',
          border: '1px solid rgba(0, 230, 118, 0.3)',
        },
      }}
    >
      {/* Background Glow */}
      <Box
        sx={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(0, 230, 118, 0.15)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TimeIcon sx={{ color: '#00E676', fontSize: 20 }} />
          <Typography
            variant="subtitle2"
            sx={{
              color: '#94A3B8',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Activité 24h Glissant
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1 }}>
          <Typography
            sx={{
              fontWeight: 950,
              fontSize: '3rem',
              color: '#F8FAFC',
              lineHeight: 1,
              fontFamily: 'Outfit, Roboto, sans-serif',
              textShadow: '0 2px 10px rgba(0, 230, 118, 0.2)',
            }}
          >
            {count}
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
            match{count > 1 ? 's' : ''} joué{count > 1 ? 's' : ''}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        {count > 0 ? (
          <>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#00E676',
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': {
                  '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(0, 230, 118, 0.7)' },
                  '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(0, 230, 118, 0)' },
                  '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(0, 230, 118, 0)' },
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Ligue active en ce moment <TrendIcon sx={{ fontSize: 14 }} />
            </Typography>
          </>
        ) : (
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Aucun match enregistré ces dernières 24 heures.
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
