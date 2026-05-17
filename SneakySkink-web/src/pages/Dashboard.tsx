import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  People as CoachIcon,
  Layers as CompIcon,
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface DashboardStats {
  leagues: number;
  competitions: number;
  teams: number;
  coaches: number;
  matches: number;
}

interface MatchRaw {
  startedAt: string;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [matches24h, setMatches24h] = useState<{ hour: string; count: number }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search input states
  const [searchCoach, setSearchCoach] = useState('');
  const [searchLeague, setSearchLeague] = useState('');
  const [searchComp, setSearchComp] = useState('');

  // Suggestions state
  const [coachSuggestions, setCoachSuggestions] = useState<any[]>([]);
  const [leagueSuggestions, setLeagueSuggestions] = useState<any[]>([]);
  const [compSuggestions, setCompSuggestions] = useState<any[]>([]);
  const [activeSearchField, setActiveSearchField] = useState<'coach' | 'league' | 'comp' | null>(null);
  const [allLeagues, setAllLeagues] = useState<any[]>([]);

  // Fetch all leagues once for instant client-side autocomplete suggestions
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const res = await api.getLeagues();
        setAllLeagues((res as any).data || []);
      } catch (err) {
        console.error('Failed to load leagues for autocomplete', err);
      }
    };
    fetchLeagues();
  }, []);

  // Debounced Coach Suggestions
  useEffect(() => {
    if (!searchCoach.trim()) {
      setCoachSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getCoaches({ search: searchCoach, limit: 5 });
        setCoachSuggestions((res as any).data || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchCoach]);

  // Client-side League Suggestions
  useEffect(() => {
    if (!searchLeague.trim()) {
      setLeagueSuggestions([]);
      return;
    }
    const filtered = allLeagues.filter(l => 
      l.name.toLowerCase().includes(searchLeague.toLowerCase())
    ).slice(0, 5);
    setLeagueSuggestions(filtered);
  }, [searchLeague, allLeagues]);

  // Debounced Competition Suggestions
  useEffect(() => {
    if (!searchComp.trim()) {
      setCompSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getCompetitions({ search: searchComp } as any);
        setCompSuggestions((res as any).data?.slice(0, 5) || []);
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchComp]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // 1. Fetch main stats
        const rootData = await api.getStatus();
        setStats(rootData.stats);

        // 2. Fetch queue/health status (includes harvesterRunning & cyanideOnline)
        const queueData = await api.getSyncQueue();
        setQueueStatus(queueData);

        // 3. Fetch recent matches to calculate last 24h activity
        const matchesRes = await api.getMatches({ limit: 100 });
        const matchesData: MatchRaw[] = (matchesRes as any).data || [];

        // Calculate hours
        const now = new Date();
        const hourlyBuckets: { [key: string]: number } = {};
        
        // Initialize last 24 hours
        for (let i = 23; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 60 * 60 * 1000);
          const hourLabel = `${d.getHours()}:00`;
          hourlyBuckets[hourLabel] = 0;
        }

        // Aggregate matches into buckets
        const oneDayAgo = now.getTime() - 24 * 60 * 60 * 1000;
        matchesData.forEach((m) => {
          const matchTime = new Date(m.startedAt).getTime();
          if (matchTime >= oneDayAgo) {
            const date = new Date(m.startedAt);
            const hourLabel = `${date.getHours()}:00`;
            if (hourLabel in hourlyBuckets) {
              hourlyBuckets[hourLabel]++;
            }
          }
        });

        // Convert to array
        const chartData = Object.entries(hourlyBuckets).map(([hour, count]) => ({
          hour,
          count,
        }));
        setMatches24h(chartData);

      } catch (err) {
        console.error('Failed to load dashboard data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  // Handle Search Submissions
  const handleCoachSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCoach.trim()) {
      navigate(`/search?tab=coaches&q=${encodeURIComponent(searchCoach)}`);
    }
  };

  const handleLeagueSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchLeague.trim()) {
      navigate(`/leagues?search=${encodeURIComponent(searchLeague)}`);
    }
  };

  const handleCompSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchComp.trim()) {
      navigate(`/competitions?search=${encodeURIComponent(searchComp)}`);
    }
  };

  // Find max match count for scaling chart
  const maxMatches = Math.max(...matches24h.map((d) => d.count), 1);

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.5s ease-in-out' }}>
      
      {/* 🦎 Clean Minimalist Banner */}
      <Box sx={{ textAlign: 'center', mb: 5, mt: 2 }}>
        <Typography 
          variant="h2" 
          sx={{ 
            fontFamily: 'Outfit', 
            fontWeight: 900, 
            fontSize: { xs: '2.5rem', md: '4rem' },
            color: '#F8FAFC',
            mb: 1,
            letterSpacing: '-0.03em'
          }}
        >
          SNEAKY<span style={{ color: '#00E676' }}>SKINK</span>
        </Typography>
        <Typography variant="h6" sx={{ color: '#94A3B8', fontWeight: 500, maxWidth: '600px', mx: 'auto' }}>
          Visualisation de données et statistiques analytiques pour Blood Bowl 3.
        </Typography>
      </Box>

      {/* 🔍 Three Dynamic Search Fields (Recherche Express as first block) */}
      <Card sx={{ p: 4, borderRadius: 5, mb: 6, border: '1px solid rgba(0, 230, 118, 0.15) !important' }}>
        <Grid container spacing={4} alignItems="stretch">
          
          {/* Coach Search */}
          <Grid item xs={12} md={4}>
            <form onSubmit={handleCoachSearchSubmit} style={{ height: '100%' }}>
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CoachIcon sx={{ color: '#00E676', fontSize: 18 }} /> Rechercher un Coach
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ex: Breakyt..."
                    value={searchCoach}
                    onChange={(e) => setSearchCoach(e.target.value)}
                    onFocus={() => setActiveSearchField('coach')}
                    onBlur={() => setTimeout(() => setActiveSearchField(null), 250)}
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
                        bgcolor: 'rgba(255,255,255,0.01)',
                        borderRadius: 3.5,
                        '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.12)' },
                        '&:hover fieldset': { borderColor: '#00E676' },
                        '&.Mui-focused fieldset': { borderColor: '#00E676', borderWidth: '1px' },
                      }
                    }}
                  />
                </Box>

                {/* Suggestions Overlay */}
                {activeSearchField === 'coach' && coachSuggestions.length > 0 && (
                  <Paper 
                    className="glass-panel" 
                    sx={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 1000, 
                      mt: 1, 
                      maxHeight: 280, 
                      overflowY: 'auto', 
                      borderRadius: 3.5, 
                      border: '1px solid rgba(0, 230, 118, 0.25)', 
                      bgcolor: 'rgba(15, 23, 42, 0.98)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <List sx={{ py: 1 }}>
                      {coachSuggestions.map((item) => (
                        <ListItem 
                          button 
                          key={item.id} 
                          onClick={() => navigate(`/coaches/${item.id}`)}
                          sx={{ 
                            py: 1.5, 
                            px: 2, 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            '&:last-child': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'rgba(0, 230, 118, 0.08)' } 
                          }}
                        >
                          <ListItemText 
                            primary={item.name} 
                            secondary={`${item.teamsCount || 0} équipes • ${item.matchesCount || 0} matchs`}
                            primaryTypographyProps={{ sx: { fontWeight: 800, color: '#F8FAFC' } }}
                            secondaryTypographyProps={{ sx: { color: '#64748B', fontWeight: 600, fontSize: '0.75rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </form>
          </Grid>

          {/* League Search */}
          <Grid item xs={12} md={4}>
            <form onSubmit={handleLeagueSearchSubmit} style={{ height: '100%' }}>
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TrophyIcon sx={{ color: '#00E676', fontSize: 18 }} /> Rechercher une Ligue
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ex: Ligue Fr..."
                    value={searchLeague}
                    onChange={(e) => setSearchLeague(e.target.value)}
                    onFocus={() => setActiveSearchField('league')}
                    onBlur={() => setTimeout(() => setActiveSearchField(null), 250)}
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
                        bgcolor: 'rgba(255,255,255,0.01)',
                        borderRadius: 3.5,
                        '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.12)' },
                        '&:hover fieldset': { borderColor: '#00E676' },
                        '&.Mui-focused fieldset': { borderColor: '#00E676', borderWidth: '1px' },
                      }
                    }}
                  />
                </Box>

                {/* Suggestions Overlay */}
                {activeSearchField === 'league' && leagueSuggestions.length > 0 && (
                  <Paper 
                    className="glass-panel" 
                    sx={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 1000, 
                      mt: 1, 
                      maxHeight: 280, 
                      overflowY: 'auto', 
                      borderRadius: 3.5, 
                      border: '1px solid rgba(0, 230, 118, 0.25)', 
                      bgcolor: 'rgba(15, 23, 42, 0.98)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <List sx={{ py: 1 }}>
                      {leagueSuggestions.map((item) => (
                        <ListItem 
                          button 
                          key={item.id} 
                          onClick={() => navigate(`/leagues/${item.id}`)}
                          sx={{ 
                            py: 1.5, 
                            px: 2, 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            '&:last-child': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'rgba(0, 230, 118, 0.08)' } 
                          }}
                        >
                          <ListItemText 
                            primary={item.name} 
                            secondary={`${item.gamerCount || 0} joueurs • ${item.competitionsCount || 0} comp.`}
                            primaryTypographyProps={{ sx: { fontWeight: 800, color: '#F8FAFC' } }}
                            secondaryTypographyProps={{ sx: { color: '#64748B', fontWeight: 600, fontSize: '0.75rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </form>
          </Grid>

          {/* Competition Search */}
          <Grid item xs={12} md={4}>
            <form onSubmit={handleCompSearchSubmit} style={{ height: '100%' }}>
              <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CompIcon sx={{ color: '#00E676', fontSize: 18 }} /> Rechercher une Compétition
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Ex: Championnat..."
                    value={searchComp}
                    onChange={(e) => setSearchComp(e.target.value)}
                    onFocus={() => setActiveSearchField('comp')}
                    onBlur={() => setTimeout(() => setActiveSearchField(null), 250)}
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
                        bgcolor: 'rgba(255,255,255,0.01)',
                        borderRadius: 3.5,
                        '& fieldset': { borderColor: 'rgba(148, 163, 184, 0.12)' },
                        '&:hover fieldset': { borderColor: '#00E676' },
                        '&.Mui-focused fieldset': { borderColor: '#00E676', borderWidth: '1px' },
                      }
                    }}
                  />
                </Box>

                {/* Suggestions Overlay */}
                {activeSearchField === 'comp' && compSuggestions.length > 0 && (
                  <Paper 
                    className="glass-panel" 
                    sx={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      zIndex: 1000, 
                      mt: 1, 
                      maxHeight: 280, 
                      overflowY: 'auto', 
                      borderRadius: 3.5, 
                      border: '1px solid rgba(0, 230, 118, 0.25)', 
                      bgcolor: 'rgba(15, 23, 42, 0.98)',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                      animation: 'fadeIn 0.2s ease-in-out'
                    }}
                  >
                    <List sx={{ py: 1 }}>
                      {compSuggestions.map((item) => (
                        <ListItem 
                          button 
                          key={item.id} 
                          onClick={() => navigate(`/competitions/${item.id}`)}
                          sx={{ 
                            py: 1.5, 
                            px: 2, 
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            '&:last-child': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'rgba(0, 230, 118, 0.08)' } 
                          }}
                        >
                          <ListItemText 
                            primary={item.name} 
                            secondary={`${item.leagueName} • Format: ${item.format}`}
                            primaryTypographyProps={{ sx: { fontWeight: 800, color: '#F8FAFC' } }}
                            secondaryTypographyProps={{ sx: { color: '#64748B', fontWeight: 600, fontSize: '0.75rem' } }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </form>
          </Grid>

        </Grid>
      </Card>

      {/* 📊 SVB Bar Chart - Matches Played in Last 24 Hours */}
      <Card sx={{ mb: 6, p: { xs: 2, md: 4 }, borderRadius: 5 }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontFamily: 'Outfit', 
            fontWeight: 800, 
            mb: 4, 
            textAlign: 'center', 
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5
          }}
        >
          📈 Activité des Matchs (Dernières 24 Heures)
        </Typography>

        <Box sx={{ height: 260, display: 'flex', alignItems: 'flex-end', gap: { xs: 0.5, sm: 1.5 }, px: 2, pb: 1, position: 'relative' }}>
          {matches24h.map((d, index) => {
            const barHeightPercentage = (d.count / maxMatches) * 100;
            return (
              <Box 
                key={index}
                sx={{ 
                  flex: 1, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}
              >
                {/* Value tooltip on hover */}
                {d.count > 0 && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 800, 
                      color: '#00E676', 
                      mb: 0.5,
                      fontSize: '0.75rem',
                      fontFamily: 'Outfit'
                    }}
                  >
                    {d.count}
                  </Typography>
                )}
                
                {/* Bar */}
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: `${Math.max(barHeightPercentage, d.count > 0 ? 4 : 1)}%`, 
                    bgcolor: d.count > 0 ? 'rgba(0, 230, 118, 0.85)' : 'rgba(148, 163, 184, 0.05)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: d.count > 0 ? '0 0 12px rgba(0, 230, 118, 0.4)' : 'none',
                    '&:hover': {
                      bgcolor: '#00E676',
                      boxShadow: '0 0 16px rgba(0, 230, 118, 0.7)',
                      transform: 'scaleY(1.03)',
                    }
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {/* Labels */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2, px: 2, borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
            Il y a 24h ({matches24h[0]?.hour})
          </Typography>
          <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
            Maintenant
          </Typography>
        </Box>
      </Card>

      {/* 🚀 Giant Metric Navigation Buttons */}
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card 
            className="hover-scale"
            sx={{ 
              borderRadius: 4, 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '1px solid rgba(0, 230, 118, 0.15) !important'
            }}
            onClick={() => navigate('/leagues')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <TrophyIcon sx={{ fontSize: 50, color: '#00E676', mb: 1.5 }} />
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 0.5 }}>
                {stats?.leagues || 0}
              </Typography>
              <Typography variant="h6" sx={{ color: '#94A3B8', fontWeight: 700, mb: 2 }}>
                Ligues
              </Typography>
              <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: 3, fontWeight: 700 }}>
                Parcourir les Ligues
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            className="hover-scale"
            sx={{ 
              borderRadius: 4, 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '1px solid rgba(0, 230, 118, 0.15) !important'
            }}
            onClick={() => navigate('/competitions')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <CompIcon sx={{ fontSize: 50, color: '#00E676', mb: 1.5 }} />
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 0.5 }}>
                {stats?.competitions || 0}
              </Typography>
              <Typography variant="h6" sx={{ color: '#94A3B8', fontWeight: 700, mb: 2 }}>
                Compétitions
              </Typography>
              <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: 3, fontWeight: 700 }}>
                Voir les Compétitions
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Card 
            className="hover-scale"
            sx={{ 
              borderRadius: 4, 
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(21, 29, 48, 0.85) 0%, rgba(15, 23, 42, 0.85) 100%)',
              border: '1px solid rgba(0, 230, 118, 0.15) !important'
            }}
            onClick={() => navigate('/search')}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <CoachIcon sx={{ fontSize: 50, color: '#00E676', mb: 1.5 }} />
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 0.5 }}>
                {stats?.coaches || 0}
              </Typography>
              <Typography variant="h6" sx={{ color: '#94A3B8', fontWeight: 700, mb: 2 }}>
                Coachs
              </Typography>
              <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: 3, fontWeight: 700 }}>
                Trouver un Coach
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
