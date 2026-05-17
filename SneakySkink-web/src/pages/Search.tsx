import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Tab,
  Tabs,
  Avatar,
  CardActionArea,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  People as CoachIcon,
  GroupWork as TeamIcon,
  SportsEsports as MatchIcon,
  Launch as LaunchIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { getRaceInfo } from '../utils/raceHelper';

interface CoachItem {
  id: string;
  name: string;
  country: string | null;
  twitch: string | null;
  youtube: string | null;
  teamsCount: number;
  updatedAt: string;
}

interface TeamItem {
  id: string;
  name: string;
  logo: string | null;
  raceId: number;
  value: number;
  wins: number;
  draws: number;
  losses: number;
  coachName: string;
  activePlayersCount: number;
}

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState<number>(0);
  const [query, setQuery] = useState<string>('');
  
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Trigger search on query change or tab change
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      handleSearch();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query, tabValue]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      if (tabValue === 0) {
        // Search coaches
        const res = await axios.get(`http://localhost:3001/coaches?search=${query}&limit=30`);
        setCoaches(res.data.data || []);
      } else {
        // Search teams
        const res = await axios.get(`http://localhost:3001/teams?search=${query}&limit=30`);
        setTeams(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load search results', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1 }}>
        🔍 Moteur de Recherche
      </Typography>
      <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
        Trouvez un coach par son pseudo de jeu ou explorez les feuilles d'effectif des équipes.
      </Typography>

      {/* Main Search Bar */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder={tabValue === 0 ? "Rechercher un coach par pseudo..." : "Rechercher une équipe par nom..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{
          mb: 4,
          '& .MuiOutlinedInput-root': {
            borderRadius: 4,
            bgcolor: '#151D30',
            fontSize: '1.1rem',
            '& fieldset': {
              borderColor: 'rgba(148, 163, 184, 0.08)',
            },
            '&:hover fieldset': {
              borderColor: '#00E676',
            },
          },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon style={{ color: '#94A3B8' }} />
            </InputAdornment>
          ),
        }}
      />

      {/* Selector Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 4 }}>
        <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setQuery(''); }} textColor="primary" indicatorColor="primary">
          <Tab icon={<CoachIcon />} iconPosition="start" label="Coachs" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab icon={<TeamIcon />} iconPosition="start" label="Équipes" sx={{ fontWeight: 700, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <>
          {/* Tab 0: Coach results */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              {coaches.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
                    <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                      Aucun coach ne correspond à votre recherche.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                coaches.map((coach) => (
                  <Grid item xs={12} sm={6} md={4} key={coach.id}>
                    <Card className="hover-scale" style={{ height: '100%' }}>
                      <CardActionArea onClick={() => navigate(`/coaches/${coach.id}`)} style={{ height: '100%' }}>
                        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Avatar sx={{ bgcolor: 'rgba(0, 230, 118, 0.1)', color: '#00E676', width: 44, height: 44 }}>
                              <CoachIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800 }}>
                                {coach.name}
                              </Typography>
                              {coach.country && (
                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                  Pays : {coach.country}
                                </Typography>
                              )}
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />

                          <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#A78BFA' }}>
                              {coach.teamsCount} équipes créées
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {coach.twitch && <Chip size="small" label="Twitch" color="secondary" sx={{ fontSize: '0.6rem', height: 18 }} />}
                              {coach.youtube && <Chip size="small" label="YouTube" color="error" sx={{ fontSize: '0.6rem', height: 18 }} />}
                            </Box>
                          </Box>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Tab 1: Team results */}
          {tabValue === 1 && (
            <Grid container spacing={3}>
              {teams.length === 0 ? (
                <Grid item xs={12}>
                  <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
                    <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                      Aucune équipe ne correspond à votre recherche.
                    </Typography>
                  </Paper>
                </Grid>
              ) : (
                teams.map((team) => {
                  const race = getRaceInfo(team.raceId);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={team.id}>
                      <Card className="hover-scale" style={{ height: '100%' }}>
                        <CardActionArea onClick={() => navigate(`/teams/${team.id}`)} style={{ height: '100%' }}>
                          <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Avatar
                                src={team.logo || undefined}
                                alt={team.name}
                                sx={{ bgcolor: '#0B0F19', border: `1px solid ${race.color}`, width: 44, height: 44 }}
                              >
                                🏈
                              </Avatar>
                              <Box>
                                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.2 }}>
                                  {team.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B' }}>
                                  Coach : {team.coachName}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                              <Chip
                                label={`${race.emoji} ${race.name}`}
                                size="small"
                                sx={{ bgcolor: 'rgba(255,255,255,0.03)', color: '#FFF', fontWeight: 700, fontSize: '0.65rem' }}
                              />
                              <Chip
                                label={`TV ${Math.round(team.value / 1000)}k`}
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 800, fontSize: '0.65rem' }}
                              />
                            </Box>

                            <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />

                            <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                                {team.activePlayersCount} joueurs actifs
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#00E676' }}>
                                W:{team.wins} D:{team.draws} L:{team.losses}
                              </Typography>
                            </Box>
                          </CardContent>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  );
                })
              )}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
};
