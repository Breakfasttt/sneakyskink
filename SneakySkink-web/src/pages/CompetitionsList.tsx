import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Paper,
  CardActionArea,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Layers as CompIcon,
  Search as SearchIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as MatchIcon,
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface CompetitionItem {
  id: string;
  name: string;
  format: string;
  status: string;
  round: number | null;
  roundsCount: number | null;
  teamsMax: number | null;
  teamsCount: number | null;
  leagueId: string;
  leagueName: string;
  matchesCount: number;
  updatedAt: string;
}

export const CompetitionsList: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [competitions, setCompetitions] = useState<CompetitionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter & Sort states
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>('activity'); // 'activity' | 'alpha'
  const [filterState, setFilterState] = useState<string>('active'); // 'active' | 'all' | 'inactive'

  useEffect(() => {
    const fetchCompetitions = async () => {
      try {
        setLoading(true);
        const res = await api.getCompetitions({ limit: 150 } as any);
        setCompetitions((res as any).data || []);
      } catch (err) {
        console.error('Failed to load competitions list', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompetitions();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  // Filter & Sort
  const filteredCompetitions = competitions
    .filter((comp) => {
      // 1. Search name or league name
      const matchesSearch = 
        comp.name.toLowerCase().includes(search.toLowerCase()) || 
        comp.leagueName.toLowerCase().includes(search.toLowerCase());

      // 2. Finished vs active
      const isFinished = comp.status.toLowerCase() === 'finished' || comp.status.toLowerCase() === 'archived';
      
      let matchesStatus = true;
      if (filterState === 'active') {
        matchesStatus = !isFinished;
      } else if (filterState === 'inactive') {
        matchesStatus = isFinished;
      }

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      } else {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Title */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1, color: '#F8FAFC' }}>
          🗂️ Compétitions Blood Bowl 3
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8' }}>
          Consultez et cherchez parmi l'ensemble des championnats, coupes et tournois suisses actifs ou terminés.
        </Typography>
      </Box>

      {/* 🛠️ Filters Panel */}
      <Card sx={{ p: 3, mb: 4, borderRadius: 4 }}>
        <Grid container spacing={3} alignItems="center">
          
          {/* Search Field */}
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Chercher par nom de compétition ou ligue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#00E676' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  bgcolor: 'rgba(255,255,255,0.01)',
                }
              }}
            />
          </Grid>

          {/* Sort By */}
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth>
              <InputLabel id="sort-by-label" sx={{ color: '#94A3B8' }}>Trier par</InputLabel>
              <Select
                labelId="sort-by-label"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Trier par"
                sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.01)' }}
              >
                <MenuItem value="activity">Dernière activité</MenuItem>
                <MenuItem value="alpha">Ordre alphabétique</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Status Filter */}
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth>
              <InputLabel id="filter-state-label" sx={{ color: '#94A3B8' }}>État</InputLabel>
              <Select
                labelId="filter-state-label"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                label="État"
                sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.01)' }}
              >
                <MenuItem value="active">Actives uniquement</MenuItem>
                <MenuItem value="all">Toutes les compétitions</MenuItem>
                <MenuItem value="inactive">Terminées uniquement</MenuItem>
              </Select>
            </FormControl>
          </Grid>

        </Grid>
      </Card>

      {/* Grid List */}
      {filteredCompetitions.length === 0 ? (
        <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <Typography variant="body1" sx={{ color: '#94A3B8' }}>
            Aucune compétition enregistrée ne correspond à vos critères.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCompetitions.map((comp) => (
            <Grid item xs={12} sm={6} md={4} key={comp.id}>
              <Card sx={{ height: '100%', borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.08) !important' }}>
                <CardActionArea 
                  onClick={() => navigate(`/competitions/${comp.id}`)}
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                    
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <CompIcon sx={{ color: '#00E676', fontSize: 24 }} />
                        <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC', lineHeight: 1.2 }}>
                          {comp.name}
                        </Typography>
                      </Box>
                      <Chip 
                        label={comp.status} 
                        color={comp.status.toLowerCase() === 'finished' ? 'default' : 'primary'}
                        size="small" 
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                      />
                    </Box>

                    {/* League Subtitle */}
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2, fontWeight: 700 }}>
                      🏆 Ligue : {comp.leagueName}
                    </Typography>

                    <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.03)' }} />

                    {/* Specs Row */}
                    <Grid container spacing={2} sx={{ mt: 1, mb: 'auto' }}>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Format</Typography>
                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                          {comp.format}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Ronde Courante</Typography>
                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                          R{comp.round || 1} / {comp.roundsCount || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>

                    {/* Footer Metrics */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, pt: 1, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <MatchIcon sx={{ color: '#38BDF8', fontSize: 16 }} />
                        <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                          {comp.matchesCount}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          matchs
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        {new Date(comp.updatedAt).toLocaleDateString()}
                      </Typography>
                    </Box>

                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

    </Box>
  );
};
