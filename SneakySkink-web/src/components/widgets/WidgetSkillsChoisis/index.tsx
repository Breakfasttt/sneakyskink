/**
 * Fichier : src/components/widgets/WidgetSkillsChoisis/index.tsx
 * Description : Widget réutilisable affichant les compétences acquises les plus fréquentes chez les joueurs.
 */

import React, { useMemo } from 'react';
import { Box, Typography, Paper, LinearProgress, alpha } from '@mui/material';

interface MinimalPlayer {
  acquiredSkills?: string[] | null;
}

export interface WidgetSkillsChoisisProps {
  players: MinimalPlayer[];
  limit?: number; // Nombre max de compétences à afficher (défaut : 5)
}

export const WidgetSkillsChoisis: React.FC<WidgetSkillsChoisisProps> = ({
  players,
  limit = 5,
}) => {
  // 1. Agréger les compétences acquises et calculer les fréquences
  const sortedSkills = useMemo(() => {
    const counts: Record<string, number> = {};

    players.forEach(p => {
      if (Array.isArray(p.acquiredSkills)) {
        p.acquiredSkills.forEach(skill => {
          if (skill && skill.trim().length > 0) {
            counts[skill] = (counts[skill] || 0) + 1;
          }
        });
      }
    });

    return Object.entries(counts)
      .map(([skillName, count]) => ({
        skillName,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [players, limit]);

  // Déterminer la valeur maximale pour le ratio des barres de progression
  const maxCount = useMemo(() => {
    if (sortedSkills.length === 0) return 1;
    return sortedSkills[0].count;
  }, [sortedSkills]);

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
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 3 }}>
        Compétences les Plus Choisies
      </Typography>

      {sortedSkills.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Aucune compétence acquise enregistrée
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {sortedSkills.map((skill, idx) => {
            const percentage = (skill.count / maxCount) * 100;
            return (
              <Box key={idx} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                    {skill.skillName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
                    {skill.count} joueur{skill.count > 1 ? 's' : ''}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentage}
                  sx={{
                    height: 6,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,0.05)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 99,
                      background: 'linear-gradient(90deg, #00B248 0%, #00E676 100%)',
                      boxShadow: '0 0 8px rgba(0, 230, 118, 0.4)',
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}
    </Paper>
  );
};
