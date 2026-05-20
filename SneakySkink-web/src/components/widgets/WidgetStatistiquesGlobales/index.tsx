/**
 * Fichier : src/components/widgets/WidgetStatistiquesGlobales/index.tsx
 * Description : Widget réutilisable affichant les statistiques globales de jeu (TD, KO, Blessures, Morts, Surfs, Passes, Expulsions).
 */

import React from 'react';
import { Box, Typography, Paper, alpha } from '@mui/material';
import {
  SportsSoccer as BallIcon,
  FlashOn as KoIcon,
  Healing as InjuryIcon,
  Warning as ExpulsionIcon,
  Send as PassIcon,
  TrendingFlat as SurfIcon,
  Dangerous as DeathIcon,
} from '@mui/icons-material';

export interface WidgetStatistiquesGlobalesProps {
  data: {
    touchdowns: number;
    kos: number;
    injuries: number;
    deaths: number;
    surfs: number;
    passes: number;
    expulsions: number;
  };
}

export const WidgetStatistiquesGlobales: React.FC<WidgetStatistiquesGlobalesProps> = ({ data }) => {
  const statItems = [
    {
      label: 'Touchdowns',
      value: data.touchdowns,
      icon: <BallIcon sx={{ fontSize: 20 }} />,
      color: '#00E676', // Green
    },
    {
      label: 'K.O. Infligés',
      value: data.kos,
      icon: <KoIcon sx={{ fontSize: 20 }} />,
      color: '#3B82F6', // Blue
    },
    {
      label: 'Blessures',
      value: data.injuries,
      icon: <InjuryIcon sx={{ fontSize: 20 }} />,
      color: '#F59E0B', // Amber
    },
    {
      label: 'Morts',
      value: data.deaths,
      icon: <DeathIcon sx={{ fontSize: 20 }} />,
      color: '#FF3D00', // Red/Orange
    },
    {
      label: 'Surfs',
      value: data.surfs,
      icon: <SurfIcon sx={{ fontSize: 20 }} />,
      color: '#A855F7', // Purple
    },
    {
      label: 'Passes',
      value: data.passes,
      icon: <PassIcon sx={{ fontSize: 20 }} />,
      color: '#06B6D4', // Cyan
    },
    {
      label: 'Expulsions',
      value: data.expulsions,
      icon: <ExpulsionIcon sx={{ fontSize: 20 }} />,
      color: '#E11D48', // Rose
    },
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
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 3 }}>
        Statistiques de Matchs
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
        {statItems.map((item, idx) => (
          <Box
            key={idx}
            sx={{
              p: 2,
              borderRadius: 2.5,
              border: `1px solid ${alpha(item.color, 0.15)}`,
              background: `linear-gradient(135deg, ${alpha(item.color, 0.05)} 0%, ${alpha(item.color, 0.01)} 100%)`,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: item.color,
                opacity: 0.5,
              },
              transition: 'all 0.2s',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 0 16px ${alpha(item.color, 0.15)}`,
                border: `1px solid ${alpha(item.color, 0.3)}`,
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: item.color }}>
              {item.icon}
              <Typography
                variant="caption"
                sx={{
                  color: '#64748B',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                  letterSpacing: '0.05em',
                }}
              >
                {item.label}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontWeight: 900,
                fontSize: '1.5rem',
                color: '#F8FAFC',
                lineHeight: 1,
              }}
            >
              {item.value.toLocaleString('fr-FR')}
            </Typography>
          </Box>
        ))}
      </Box>
    </Paper>
  );
};
