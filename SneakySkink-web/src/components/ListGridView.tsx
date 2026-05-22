/**
 * Composant générique d'affichage en liste/grille avec filtres et tris unifiés.
 * Offre un design premium avec transitions et unification visuelle.
 */

import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Button,
} from '@mui/material';
import {
  ViewList as ListIcon,
  ViewModule as GridIcon,
} from '@mui/icons-material';

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

interface ListGridViewProps<TSort extends string> {
  loading: boolean;
  isEmpty: boolean;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  sortBy: TSort;
  onSortChange: (sort: TSort) => void;
  sortOptions: SortOption<TSort>[];
  extraControls?: React.ReactNode;
  renderList: () => React.ReactNode;
  renderGrid: () => React.ReactNode;
  renderEmptyState: () => React.ReactNode;
}

export function ListGridView<TSort extends string>({
  loading,
  isEmpty,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  sortOptions,
  extraControls,
  renderList,
  renderGrid,
  renderEmptyState,
}: ListGridViewProps<TSort>) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }


  return (
    <Box sx={{ width: '100%' }}>
      {/* Contrôles de tri, d'affichage et filtres supplémentaires */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
          mb: 3,
          gap: 2,
        }}
      >
        {/* Options de tri */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
            Trier par :
          </Typography>
          {sortOptions.map((opt) => (
            <Button
              key={opt.value}
              size="small"
              onClick={() => onSortChange(opt.value)}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 0.5,
                px: 2,
                bgcolor: sortBy === opt.value ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                color: sortBy === opt.value ? '#00E676' : '#94A3B8',
                border: `1px solid ${sortBy === opt.value ? 'rgba(0, 230, 118, 0.3)' : 'rgba(148, 163, 184, 0.12)'}`,
                '&:hover': {
                  bgcolor: sortBy === opt.value ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sortBy === opt.value ? '#00E676' : 'rgba(148, 163, 184, 0.2)'}`,
                },
              }}
            >
              {opt.label}
            </Button>
          ))}
        </Box>

        {/* Sélection du mode d'affichage et filtres additionnels */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            alignSelf: { xs: 'flex-end', sm: 'auto' },
            flexWrap: 'wrap',
          }}
        >
          {/* Toggle liste/grille */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              bgcolor: 'rgba(15,23,42,0.4)',
              p: 0.5,
              borderRadius: 2,
              border: '1px solid rgba(148,163,184,0.08)',
            }}
          >
            <IconButton
              size="small"
              onClick={() => onViewModeChange('list')}
              sx={{
                color: viewMode === 'list' ? '#00E676' : '#64748B',
                bgcolor: viewMode === 'list' ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
                borderRadius: 1.5,
                p: 0.75,
                '&:hover': {
                  bgcolor: viewMode === 'list' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255,255,255,0.03)',
                },
              }}
            >
              <ListIcon sx={{ fontSize: 18 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => onViewModeChange('grid')}
              sx={{
                color: viewMode === 'grid' ? '#00E676' : '#64748B',
                bgcolor: viewMode === 'grid' ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
                borderRadius: 1.5,
                p: 0.75,
                '&:hover': {
                  bgcolor: viewMode === 'grid' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255,255,255,0.03)',
                },
              }}
            >
              <GridIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Filtres supplémentaires */}
          {extraControls}
        </Box>
      </Box>

      {/* Rendu effectif des données */}
      {isEmpty ? renderEmptyState() : (viewMode === 'list' ? renderList() : renderGrid())}
    </Box>
  );
}
