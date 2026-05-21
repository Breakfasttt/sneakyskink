/**
 * Fichier : src/components/widgets/WidgetRosterJoue/index.tsx
 * Description : Widget réutilisable affichant le nombre de fois qu'un roster a été joué.
 */

import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getRaceInfo } from '../../../utils/raceHelper';

export interface WidgetRosterJoueProps {
  data: { raceId: number; teamCount: number }[];
}

export const WidgetRosterJoue: React.FC<WidgetRosterJoueProps> = ({ data }) => {
  // Trier par ordre décroissant
  const sortedData = [...data]
    .sort((a, b) => b.teamCount - a.teamCount)
    .map(item => {
      const info = getRaceInfo(item.raceId);
      return {
        ...item,
        name: `${info.emoji} ${info.name}`,
        color: info.color,
      };
    });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
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
          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
            {dataPoint.name}
          </Typography>
          <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
            Équipes / Matchs : {dataPoint.teamCount}
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
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 2 }}>
        Rosters les Plus Joués
      </Typography>

      {sortedData.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>Aucune donnée disponible</Typography>
        </Box>
      ) : (
        <Box sx={{ width: '100%', height: Math.max(240, sortedData.length * 40 + 40), minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sortedData}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
              <Bar dataKey="teamCount" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};
