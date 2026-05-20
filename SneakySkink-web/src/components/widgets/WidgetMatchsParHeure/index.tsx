/**
 * Fichier : src/components/widgets/WidgetMatchsParHeure/index.tsx
 * Description : Widget réutilisable affichant le nombre de matchs joués par heure (UTC) sur les dernières 24 heures sous forme de courbe.
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface MinimalMatch {
  startedAt: string | Date;
}

export interface WidgetMatchsParHeureProps {
  matches: MinimalMatch[];
}

export const WidgetMatchsParHeure: React.FC<WidgetMatchsParHeureProps> = ({ matches }) => {
  // Calculer la chronologie des dernières 24h
  const chartData = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const targetTime = new Date(now.getTime() - i * 60 * 60 * 1000);
    const targetHourUtc = targetTime.getUTCHours();
    const targetDay = targetTime.getUTCDate();
    const targetMonth = targetTime.getUTCMonth();

    // Compter les matchs commencés durant cette heure UTC spécifique
    const count = matches.filter(m => {
      const mDate = new Date(m.startedAt);
      return (
        mDate.getUTCHours() === targetHourUtc &&
        mDate.getUTCDate() === targetDay &&
        mDate.getUTCMonth() === targetMonth
      );
    }).length;

    chartData.push({
      label: `${targetHourUtc}:00`,
      count,
    });
  }

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
            Heure (UTC) : {d.label}
          </Typography>
          <Typography variant="body2" sx={{ color: '#00E676', fontWeight: 800 }}>
            {d.count} match{d.count > 1 ? 's' : ''} joué{d.count > 1 ? 's' : ''}
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
        minWidth: 0, // Résout le calcul de largeur de Recharts
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 3 }}>
        Activité Recente (Dernières 24h UTC)
      </Typography>

      <Box sx={{ width: '100%', height: 200, minWidth: 0 }}>
        <ResponsiveContainer width="99%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00E676" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00E676" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.04)" vertical={false} />
            <XAxis dataKey="label" stroke="#475569" fontSize={9} tickLine={false} />
            <YAxis stroke="#475569" fontSize={9} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#00E676"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
};
