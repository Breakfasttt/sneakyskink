import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Tab,
  Tabs,
  Avatar,
  CardActionArea,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  People as CoachIcon,
  EmojiEvents as TrophyIcon,
  CloudSync as SyncIcon,
  SportsEsports as MatchIcon,
  YouTube as YTIcon,
  PlayArrow as TwitchIcon,
  HourglassEmpty as QueueIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { getRaceInfo } from '../utils/raceHelper';

interface CoachProfile {
  id: string;
  name: string;
  country: string | null;
  twitch: string | null;
  youtube: string | null;
  teamsCount: number;
  matchesCount: number;
  teams: Array<{
    id: string;
    name: string;
    raceId: number;
    logo: string | null;
    value: number;
    wins: number;
    draws: number;
    losses: number;
    activePlayersCount: number;
  }>;
}

export const CoachDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);
  
  // Sync Actions State
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncAlert, setSyncAlert] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchCoachData = async () => {
      try {
        setLoading(true);
        const [profileRes, statsRes] = await Promise.all([
          axios.get(`http://localhost:3001/coaches/${id}?includeTeams=true`),
          axios.get(`http://localhost:3001/stats/coach/${id}`),
        ]);

        setProfile(profileRes.data.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load coach details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCoachData();
  }, [id]);

  const handleSyncCoach = async () => {
    if (!id) return;
    try {
      setSyncing(true);
      const res = await axios.post(`http://localhost:3001/sync/coach/${id}`);
      setSyncAlert({
        open: true,
        message: `Job de synchronisation BullMQ planifié avec succès ! ID: ${res.data.jobId}`,
        severity: 'success',
      });
    } catch (err) {
      console.error('Failed to trigger coach sync', err);
      setSyncAlert({
        open: true,
        message: 'Erreur lors du déclenchement du crawling de coach. Veuillez réessayer.',
        severity: 'error',
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h5" color="error">
          Coach introuvable dans la base de données.
        </Typography>
        <Button onClick={() => navigate('/search')} sx={{ mt: 2 }}>
          Retour
        </Button>
      </Box>
    );
  }

  const summary = stats?.summary || {};
  const perf = stats?.performance || {};
  const rosterUsage = stats?.rosterUsage || [];
  const activity = stats?.activity?.hourlyActivity || [];

  // Finding the peak match activity hour
  const peakHour = activity.reduce((maxIdx: number, val: number, idx: number, arr: number[]) => (val > arr[maxIdx] ? idx : maxIdx), 0);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Back button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/search')}
        sx={{ mb: 3, fontWeight: 700, color: '#94A3B8' }}
      >
        Retour à la Recherche
      </Button>

      {/* Profile Header Banner */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          borderLeft: '4px solid #A78BFA !important',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
              <CoachIcon style={{ fontSize: 40 }} />
            </Avatar>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900 }}>
              {profile.name}
            </Typography>
            {profile.country && (
              <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                🌍 Pays : {profile.country}
              </Typography>
            )}
            <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              {profile.twitch && (
                <IconButton href={profile.twitch} target="_blank" color="secondary" sx={{ bgcolor: 'rgba(145, 70, 255, 0.15)' }}>
                  <TwitchIcon />
                </IconButton>
              )}
              {profile.youtube && (
                <IconButton href={profile.youtube} target="_blank" color="error" sx={{ bgcolor: 'rgba(255, 0, 0, 0.1)' }}>
                  <YTIcon />
                </IconButton>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} sm={4} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              onClick={handleSyncCoach}
              disabled={syncing}
              sx={{ fontWeight: 700 }}
            >
              Forcer la Synchronisation
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Statistiques & Ratios" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label={`Équipes (${profile.teams?.length || 0})`} sx={{ fontWeight: 700, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* Tab 0: Stats & Metrics */}
      {tabValue === 0 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <Grid container spacing={4}>
            {/* Left Block: Summary Indicators */}
            <Grid item xs={12} md={4}>
              <Card sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    Win Rate Global
                  </Typography>
                  <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#00E676', my: 2 }}>
                    {summary.winrate || 0}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                    {summary.wins} Victoires &bull; {summary.draws} Nuls &bull; {summary.losses} Défaites sur {summary.totalMatches} matchs joués.
                  </Typography>
                </CardContent>
              </Card>

              {/* Concessions and peaks */}
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2 }}>
                    🛡️ Discipline & Activité
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>Concessions subies / commises</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#FF3D00' }}>{summary.forfeits} forfaits</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>Ligues parcourues</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{summary.leaguesPlayedCount} ligues</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ color: '#94A3B8' }}>Heure d'activité favorite</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#38BDF8' }}>{peakHour}h00 ({activity[peakHour] || 0} matchs)</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Right Block: Aggregated Performance Details */}
            <Grid item xs={12} md={8}>
              <Card sx={{ mb: 4 }}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3 }}>
                    🏈 Performances de Jeu Cumulées
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Touchdowns marqués</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>{perf.touchdowns || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Passes complétées</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#38BDF8' }}>{perf.passes || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Interceptions</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>{perf.interceptions || 0}</Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Blocages réussis</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#10B981' }}>{perf.blocksSucceeded || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Armures brisées</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#E11D48' }}>{perf.armourBreaks || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Plaquages réussis</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#6366F1' }}>{perf.tackles || 0}</Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>KOs Infligés</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EC4899' }}>{perf.koInflicted || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Blessures graves</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EF4444' }}>{perf.injuriesInflicted || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Morts Provoquées 💀</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#1E293B' }}>{perf.deadInflicted || 0}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Roster usage */}
              {rosterUsage.length > 0 && (
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3 }}>
                      🦎 Races les Plus Jouées
                    </Typography>
                    <Grid container spacing={2}>
                      {rosterUsage.map((u: any) => {
                        const race = getRaceInfo(u.raceId);
                        const pct = u.matches > 0 ? ((u.wins + u.draws * 0.5) / u.matches * 100).toFixed(1) : 0;
                        return (
                          <Grid item xs={12} sm={6} key={u.raceId}>
                            <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h5">{race.emoji}</Typography>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{race.name}</Typography>
                                  <Typography variant="caption" sx={{ color: '#64748B' }}>{u.matches} matchs joués</Typography>
                                </Box>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00E676' }}>{pct}%</Typography>
                                <Typography variant="caption" sx={{ color: '#64748B' }}>Win Ratio</Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </CardContent>
                </Card>
              )}
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Tab 1: Teams List */}
      {tabValue === 1 && (
        <Grid container spacing={3} sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {profile.teams.length === 0 ? (
            <Grid item xs={12}>
              <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                  Aucune équipe enregistrée pour ce coach.
                </Typography>
              </Paper>
            </Grid>
          ) : (
            profile.teams.map((team) => {
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
                          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.2 }}>
                            {team.name}
                          </Typography>
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

      {/* Snackbar Alert for Synchro */}
      {syncAlert && (
        <Snackbar
          open={syncAlert.open}
          autoHideDuration={6000}
          onClose={() => setSyncAlert(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setSyncAlert(null)} severity={syncAlert.severity} sx={{ width: '100%' }}>
            {syncAlert.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};
