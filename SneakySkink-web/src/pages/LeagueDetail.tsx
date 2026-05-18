import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
  Avatar,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  CardActionArea,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  ChevronLeft as BackIcon,
  People as CoachIcon,
  Layers as CompIcon,
  SportsEsports as MatchIcon,
  Schedule as TimeIcon,
  Star as StarIcon,
  CalendarToday as DateIcon,
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
}

interface MatchItem {
  id: string;
  round: number;
  startedAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeam: { name: string; logo: string | null };
  awayTeam: { name: string; logo: string | null };
}

interface LeagueDetailData {
  id: string;
  name: string;
  logo: string | null;
  gamerCount: number | null;
  active: boolean;
  competitions: CompetitionItem[];
}

export const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<LeagueDetailData | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [filterState, setFilterState] = useState<string>('active'); // 'active' | 'all' | 'inactive'

  useEffect(() => {
    if (!id) return;

    const fetchLeagueData = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch league with its competitions
        const leagueRes = await api.getLeague(id);
        setLeague((leagueRes as any).data);

        // 2. Fetch league statistics (coach count & last activity)
        const statsRes = await api.getLeagueStats(id);
        setStats((statsRes as any).data);

        // 3. Fetch 5 most recent matches
        const matchesRes = await api.getMatches({ leagueId: id, limit: 5 } as any);
        setRecentMatches((matchesRes as any).data || []);

      } catch (err) {
        console.error('Failed to load league details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeagueData();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  if (!league) {
    return (
      <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: '600px', mx: 'auto', mt: 4 }}>
        <Typography variant="h5" sx={{ color: '#EF4444', mb: 2, fontWeight: 700 }}>
          Ligue Introuvable
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
          La ligue demandée n'existe pas ou a été supprimée du serveur.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/leagues')} startIcon={<BackIcon />}>
          Retour aux Ligues
        </Button>
      </Paper>
    );
  }

  // Filter Competitions
  const filteredCompetitions = (league.competitions || []).filter((comp) => {
    const matchesName = comp.name.toLowerCase().includes(search.toLowerCase());
    
    // Status filters: BB3 Statuses include 'Running', 'Official', 'PreSeason', 'Finished', etc.
    // We map 'Finished' to inactive/terminated, and others to active.
    const isFinished = comp.status.toLowerCase() === 'finished' || comp.status.toLowerCase() === 'archived';
    
    if (filterState === 'active') {
      return matchesName && !isFinished;
    } else if (filterState === 'inactive') {
      return matchesName && isFinished;
    }
    return matchesName;
  });

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Back Button */}
      <Button 
        variant="text" 
        onClick={() => navigate('/leagues')} 
        startIcon={<BackIcon />} 
        sx={{ color: '#94A3B8', mb: 3, '&:hover': { color: '#00E676' } }}
      >
        Retour aux Ligues
      </Button>

      {/* 👑 League Header Card */}
      <Card sx={{ p: 4, borderRadius: 5, mb: 4 }}>
        <Grid container spacing={4} alignItems="center">
          
          {/* Logo & Name */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
            <Avatar 
              src={league.logo || undefined}
              sx={{ 
                width: 100, 
                height: 100, 
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(0, 230, 118, 0.4)',
                boxShadow: '0 0 20px rgba(0, 230, 118, 0.15)'
              }}
            >
              <TrophyIcon sx={{ color: '#94A3B8', fontSize: 50 }} />
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 1, lineHeight: 1.1 }}>
                {league.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Chip 
                  label={league.active ? 'Ligue Active' : 'Ligue Terminée'} 
                  color={league.active ? 'success' : 'default'}
                  sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem' }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Stats Metrics */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={2}>
              
              {/* Unique Coaches */}
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3, textAlign: 'center' }}>
                  <CoachIcon sx={{ color: '#00E676', fontSize: 24, mb: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    Coachs Unique
                  </Typography>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC' }}>
                    {stats?.summary?.coachesCount || 0}
                  </Typography>
                </Paper>
              </Grid>

              {/* Last Activity */}
              <Grid item xs={6}>
                <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3, textAlign: 'center' }}>
                  <TimeIcon sx={{ color: '#38BDF8', fontSize: 24, mb: 0.5 }} />
                  <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    Dernière Activité
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {stats?.summary?.lastActivity 
                      ? new Date(stats.summary.lastActivity).toLocaleDateString()
                      : 'Aucune'}
                  </Typography>
                </Paper>
              </Grid>

            </Grid>
          </Grid>

        </Grid>
      </Card>

      {/* Main Grid Content: Competitions (Left) & Recent Matches (Right) */}
      <Grid container spacing={4}>
        
        {/* LEFT COLUMN: Competitions */}
        <Grid item xs={12} lg={8}>
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' }, gap: 2, mb: 3 }}>
            <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC' }}>
              🗂️ Compétitions de la Ligue
            </Typography>
            
            {/* Filter controls */}
            <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' } }}>
              <TextField
                placeholder="Chercher une comp..."
                size="small"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                sx={{
                  width: { xs: '100%', sm: 180 },
                  '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: 'background.paper' }
                }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  sx={{ borderRadius: 3, bgcolor: 'background.paper' }}
                >
                  <MenuItem value="active">Actives</MenuItem>
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="inactive">Terminées</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          {/* Competitions Grid */}
          {filteredCompetitions.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucune compétition ne correspond aux critères.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {filteredCompetitions.map((comp) => (
                <Grid item xs={12} sm={6} key={comp.id}>
                  <Card sx={{ borderRadius: 3, border: '1px solid rgba(148, 163, 184, 0.06) !important' }}>
                    <CardActionArea onClick={() => navigate(`/competitions/${comp.id}`)}>
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC', pr: 2 }}>
                            {comp.name}
                          </Typography>
                          <Chip 
                            label={comp.status} 
                            color={comp.status.toLowerCase() === 'finished' ? 'default' : 'primary'}
                            size="small" 
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        </Box>

                        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.03)' }} />

                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Format</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                              {comp.format}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Ronde / Max</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                              R{comp.round || 1} / {comp.roundsCount || 'N/A'}
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

        </Grid>

        {/* RIGHT COLUMN: Recent Matches */}
        <Grid item xs={12} lg={4}>
          <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
            🎮 Matchs Récents
          </Typography>

          {recentMatches.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                Aucun match enregistré pour le moment.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentMatches.map((match) => (
                <Card 
                  key={match.id} 
                  sx={{ 
                    borderRadius: 3.5, 
                    border: '1px solid rgba(148, 163, 184, 0.05) !important',
                    bgcolor: 'rgba(21, 29, 48, 0.4)'
                  }}
                >
                  <CardActionArea onClick={() => navigate(`/matches/${match.id}`)}>
                    <CardContent sx={{ p: 2 }}>
                      
                      {/* Round indicator */}
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block', mb: 1 }}>
                        Ronde {match.round} • {new Date(match.startedAt).toLocaleDateString()}
                      </Typography>

                      {/* Teams & Scores row */}
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifySelf: 'stretch', gap: 1 }}>
                        
                        {/* Home Team */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.5 }}>
                          <Avatar src={match.homeTeam.logo || undefined} sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.03)' }} />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80px' }}>
                            {match.homeTeam.name}
                          </Typography>
                        </Box>

                        {/* Scores */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1 }}>
                          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: match.homeScore > match.awayScore ? '#00E676' : '#94A3B8' }}>
                            {match.homeScore}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>VS</Typography>
                          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: match.awayScore > match.homeScore ? '#00E676' : '#94A3B8' }}>
                            {match.awayScore}
                          </Typography>
                        </Box>

                        {/* Away Team */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 0.5 }}>
                          <Avatar src={match.awayTeam.logo || undefined} sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.03)' }} />
                          <Typography variant="caption" sx={{ fontWeight: 800, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '80px' }}>
                            {match.awayTeam.name}
                          </Typography>
                        </Box>

                      </Box>

                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          )}
        </Grid>

      </Grid>

    </Box>
  );
};
