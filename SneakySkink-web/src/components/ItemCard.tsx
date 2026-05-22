/**
 * Composant carte générique pour l'affichage en grille.
 * Uniformise le design (hauteur fixe, effets de survol, troncature des textes)
 * tout en restant flexible pour les différentes entités (ligues, compétitions, coachs).
 */

import React from 'react';
import { Paper, Box, Typography, IconButton } from '@mui/material';
import { ArrowForward as ArrowIcon } from '@mui/icons-material';

interface ItemCardProps {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  iconBorderColor?: string;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
}

export const ItemCard: React.FC<ItemCardProps> = ({
  title,
  onClick,
  icon,
  iconBgColor = 'rgba(148,163,184,0.06)',
  iconColor = '#94A3B8',
  iconBorderColor = 'rgba(148,163,184,0.15)',
  subtitle,
  description,
}) => {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        width: '100%',
        height: 96,
        p: 2,
        borderRadius: '8px',
        border: '1px solid rgba(148,163,184,0.08)',
        background: 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.4) 100%)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          border: '1px solid rgba(0,230,118,0.3)',
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,230,118,0.05)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
        {/* Conteneur d'icône de taille uniforme */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            bgcolor: iconBgColor,
            border: `1px solid ${iconBorderColor}`,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>

        {/* Informations textuelles */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              color: '#F8FAFC',
              fontSize: '0.95rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            {subtitle}
          </Box>

          {description && (
            <Typography
              variant="caption"
              sx={{
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                mt: 0.5,
                fontWeight: 500,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Bouton flèche d'action */}
      <IconButton
        sx={{
          color: '#334155',
          bgcolor: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(148,163,184,0.06)',
          borderRadius: '8px',
          p: 0.75,
          ml: 1.5,
          transition: 'all 0.2s',
          '&:hover': {
            color: '#00E676',
            bgcolor: 'rgba(0,230,118,0.05)',
            border: '1px solid rgba(0,230,118,0.2)',
          },
        }}
      >
        <ArrowIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Paper>
  );
};
