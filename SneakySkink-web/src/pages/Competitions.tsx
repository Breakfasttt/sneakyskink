import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  InputBase,
  CircularProgress,
  alpha,
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  SportsSoccer as CompetitionIcon,
  ArrowForward as ArrowIcon,
  EmojiEvents as LeagueIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { api } from '../api';

const Competitions: React.FC = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    api.getCompetitions()
      .then((res: any) => {
        // Defensive check: API might wrap it in { success: true, data: [...] }
        const list = res.data || res || [];
        setCompetitions(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredCompetitions = competitions.filter((comp) => {
    const matchesSearch = comp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comp.leagueName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' ? true : comp.status === statusFilter;
    const matchesFormat = formatFilter === 'ALL' ? true : comp.format === formatFilter;
    return matchesSearch && matchesStatus && matchesFormat;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'InProgress': return '#3B82F6';
      case 'Played':
      case 'Validated': return '#00E676';
      case 'Scheduled': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'InProgress': return 'En cours';
      case 'Played': return 'Jouée';
      case 'Validated': return 'Validée';
      case 'Scheduled': return 'Planifiée';
      default: return status;
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            🎯 Compétitions
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Suivez le déroulement de tous les tournois et championnats
          </Typography>
        </Box>
      </Box>

      {/* Filters & Search */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              height: 48,
              borderRadius: 3,
              border: '1px solid rgba(148,163,184,0.12)',
              bgcolor: 'rgba(21,29,48,0.8)',
              '&:focus-within': {
                border: '1px solid rgba(0,230,118,0.4)',
              },
              transition: 'all 0.2s',
            }}
          >
            <SearchIcon sx={{ color: '#475569', mr: 1 }} />
            <InputBase
              fullWidth
              placeholder="Rechercher par compétition ou ligue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ fontSize: '0.9rem', color: '#F8FAFC' }}
            />
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              displayEmpty
              sx={{
                height: 48,
                bgcolor: 'rgba(21,29,48,0.8)',
                border: '1px solid rgba(148,163,184,0.12)',
                borderRadius: 3,
                color: '#F8FAFC',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
              }}
            >
              <MenuItem value="ALL">Tous les statuts</MenuItem>
              <MenuItem value="InProgress">En cours</MenuItem>
              <MenuItem value="Scheduled">Planifiée</MenuItem>
              <MenuItem value="Validated">Validée</MenuItem>
              <MenuItem value="Played">Jouée</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={6} md={3}>
          <FormControl fullWidth size="small">
            <Select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value)}
              displayEmpty
              sx={{
                height: 48,
                bgcolor: 'rgba(21,29,48,0.8)',
                border: '1px solid rgba(148,163,184,0.12)',
                borderRadius: 3,
                color: '#F8FAFC',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&:hover .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { border: 'none' },
              }}
            >
              <MenuItem value="ALL">Tous les formats</MenuItem>
              <MenuItem value="RoundRobin">Championnat</MenuItem>
              <MenuItem value="Knockout">Élimination directe</MenuItem>
              <MenuItem value="Wissen">Ronde suisse</MenuItem>
              <MenuItem value="Ladder">Échelle</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00E676' }} />
        </Box>
      ) : filteredCompetitions.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed rgba(148,163,184,0.08)',
            borderRadius: 3,
            bgcolor: 'rgba(15,23,42,0.4)',
          }}
        >
          <CompetitionIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
          <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Aucune compétition trouvée
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Veuillez ajuster vos filtres de recherche.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredCompetitions.map((comp) => {
            const statusColor = getStatusColor(comp.status);
            return (
              <Grid item xs={12} sm={6} key={comp.id}>
                <Paper
                  onClick={() => navigate(`/competition/${comp.id}`)}
                  elevation={0}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    border: `1px solid rgba(148,163,184,0.08)`,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        bgcolor: 'rgba(59,130,246,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(59,130,246,0.15)',
                        color: '#3B82F6',
                        flexShrink: 0,
                      }}
                    >
                      <CompetitionIcon sx={{ fontSize: 20 }} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {comp.name}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                          <LeagueIcon sx={{ fontSize: 12, color: '#F59E0B' }} />
                          <Typography variant="caption" sx={{ fontWeight: 600 }}>
                            {comp.leagueName}
                          </Typography>
                        </Box>

                        <Chip
                          label={getStatusLabel(comp.status)}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            bgcolor: alpha(statusColor, 0.08),
                            color: statusColor,
                            border: `1px solid ${alpha(statusColor, 0.15)}`,
                          }}
                        />

                        {comp.teamsCount !== undefined && (
                          <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600 }}>
                            {comp.teamsCount}/{comp.teamsMax ?? '∞'} équipes
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <IconButton
                    sx={{
                      color: '#334155',
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(148,163,184,0.06)',
                      borderRadius: 2,
                      p: 0.75,
                      transition: 'all 0.2s',
                      '&:hover': {
                        color: '#00E676',
                        bgcolor: 'rgba(0,230,118,0.05)',
                        border: '1px solid rgba(0,230,118,0.2)',
                      }
                    }}
                  >
                    <ArrowIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};

export default Competitions;
