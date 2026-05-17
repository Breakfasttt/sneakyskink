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
  Avatar,
  CardActionArea,
  Divider,
  Paper,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Layers as CompIcon,
  SportsEsports as MatchIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface LeagueItem {
  id: string;
  name: string;
  logo: string | null;
  gamerCount: number | null;
  active: boolean;
  competitionsCount: number;
  matchesCount: number;
  updatedAt: string;
}

export const Leagues: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters & Sorting states
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState<string>('activity'); // 'activity' | 'alpha'
  const [filterState, setFilterState] = useState<string>('active'); // 'active' | 'all' | 'inactive'

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        const res = await api.getLeagues();
        setLeagues((res as any).data || []);
      } catch (err) {
        console.error('Failed to load leagues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  // Detect official leagues
  const isOfficial = (name: string): boolean => {
    const lower = name.toLowerCase();
    return (
      lower.includes('official') ||
      lower.includes('cyanide') ||
      lower.includes('ladder') ||
      lower.includes('arena') ||
      lower.includes('champions cup')
    );
  };

  // Filter & Sort logic
  const filteredLeagues = leagues
    .filter((league) => {
      // 1. Name search
      const matchesName = league.name.toLowerCase().includes(search.toLowerCase());
      
      // 2. Active status filter
      let matchesStatus = true;
      if (filterState === 'active') {
        matchesStatus = league.active === true;
      } else if (filterState === 'inactive') {
        matchesStatus = league.active === false;
      }

      return matchesName && matchesStatus;
    })
    .sort((a, b) => {
      // 1. Pinned official leagues always go to the top
      const aOfficial = isOfficial(a.name);
      const bOfficial = isOfficial(b.name);
      if (aOfficial && !bOfficial) return -1;
      if (!aOfficial && bOfficial) return 1;

      // 2. Sorting choice
      if (sortBy === 'alpha') {
        return a.name.localeCompare(b.name);
      } else {
        // Sort by last activity (updatedAt)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Page Title */}
      <Box sx={{ mb: 5 }}>
        <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1, color: '#F8FAFC' }}>
          🏆 Ligues Blood Bowl 3
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8' }}>
          Explorez les ligues enregistrées, visualisez leurs compétitions en cours et suivez les résultats récents.
        </Typography>
      </Box>

      {/* 🛠️ Filters & Search Bar Section */}
      <Card sx={{ p: 3, mb: 4, borderRadius: 4 }}>
        <Grid container spacing={3} alignItems="center">
          
          {/* Text Search */}
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              placeholder="Filtrer par nom de ligue..."
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

          {/* Sorting */}
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth variant="outlined">
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

          {/* Active / Terminated Filter */}
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="filter-state-label" sx={{ color: '#94A3B8' }}>État des Ligues</InputLabel>
              <Select
                labelId="filter-state-label"
                value={filterState}
                onChange={(e) => setFilterState(e.target.value)}
                label="État des Ligues"
                sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.01)' }}
              >
                <MenuItem value="active">Actives uniquement</MenuItem>
                <MenuItem value="all">Toutes les ligues</MenuItem>
                <MenuItem value="inactive">Terminées / Exclues</MenuItem>
              </Select>
            </FormControl>
          </Grid>

        </Grid>
      </Card>

      {/* 📦 Leagues Grid */}
      {filteredLeagues.length === 0 ? (
        <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
          <Typography variant="h6" sx={{ color: '#94A3B8' }}>
            Aucune ligue ne correspond à vos critères de recherche.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredLeagues.map((league) => {
            const official = isOfficial(league.name);
            return (
              <Grid item xs={12} sm={6} md={4} key={league.id}>
                <Card 
                  className="hover-scale" 
                  sx={{ 
                    height: '100%', 
                    borderRadius: 4, 
                    border: official 
                      ? '1px solid rgba(0, 230, 118, 0.25) !important' 
                      : '1px solid rgba(148, 163, 184, 0.08) !important',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Pinned Official Stamp */}
                  {official && (
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 0.5,
                        bgcolor: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid rgba(0, 230, 118, 0.3)',
                        borderRadius: 2,
                        px: 1,
                        py: 0.2,
                        zIndex: 2
                      }}
                    >
                      <StarIcon sx={{ color: '#00E676', fontSize: 14 }} />
                      <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, fontSize: '0.65rem' }}>
                        OFFICIEL
                      </Typography>
                    </Box>
                  )}

                  <CardActionArea 
                    onClick={() => navigate(`/leagues/${league.id}`)}
                    sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                  >
                    <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                      
                      {/* Logo and Name */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                        <Avatar 
                          src={league.logo || undefined}
                          sx={{ 
                            width: 52, 
                            height: 52, 
                            bgcolor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)'
                          }}
                        >
                          <TrophyIcon sx={{ color: '#94A3B8' }} />
                        </Avatar>
                        <Box>
                          <Typography 
                            variant="h6" 
                            sx={{ 
                              fontFamily: 'Outfit', 
                              fontWeight: 800, 
                              lineHeight: 1.2, 
                              color: '#F8FAFC',
                              // Max 2 lines of text
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {league.name}
                          </Typography>
                          <Chip 
                            label={league.active ? 'Active' : 'Terminée'} 
                            color={league.active ? 'success' : 'default'}
                            size="small"
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800, mt: 0.5 }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.04)' }} />

                      {/* Info metrics */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CompIcon sx={{ color: '#00E676', fontSize: 18 }} />
                          <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                            {league.competitionsCount}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', ml: 0.2 }}>
                            comps
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <MatchIcon sx={{ color: '#38BDF8', fontSize: 18 }} />
                          <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                            {league.matchesCount}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8', ml: 0.2 }}>
                            matchs
                          </Typography>
                        </Box>
                      </Box>

                      {/* Last Activity */}
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 2, textAlign: 'right', fontWeight: 600 }}>
                        Activité : {new Date(league.updatedAt).toLocaleDateString()}
                      </Typography>

                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

    </Box>
  );
};
