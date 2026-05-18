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
  LinearProgress,
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
  Schedule as TimeIcon,
} from '@mui/icons-material';
import { api } from '../api';
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

interface MatchItem {
  id: string;
  round: number;
  startedAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string; logo: string | null };
  awayTeam: { name: string; logo: string | null };
  homeCoach: { name: string } | null;
  awayCoach: { name: string } | null;
}

export const CoachDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [recentMatches, setRecentMatches] = useState<MatchItem[]>([]);
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
        const [profileRes, statsRes, matchesRes] = await Promise.all([
          api.getCoach(id),
          api.getCoachStats(id),
          api.getMatches({ coachId: id, limit: 5 } as any),
        ]);

        setProfile((profileRes as any).data);
        setStats((statsRes as any).data);
        setRecentMatches((matchesRes as any).data || []);
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
      await api.syncCoach(id);
      setSyncAlert({
        open: true,
        message: `Job de synchronisation BullMQ planifié avec succès !`,
        severity: 'success',
      });
    } catch (err: any) {
      setSyncAlert({
        open: true,
        message: `Échec de planification : ${err.response?.data?.message || err.message}`,
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

  if (!profile || !stats) {
    return (
      <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: '600px', mx: 'auto', mt: 4 }}>
        <Typography variant="h5" sx={{ color: '#EF4444', mb: 2, fontWeight: 700 }}>
          Coach Introuvable
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
          Le coach demandé n'existe pas ou n'est pas encore enregistré.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')} startIcon={<BackIcon />}>
          Retour à l'accueil
        </Button>
      </Paper>
    );
  }

  const s = stats.summary || {};
  const perf = stats.performance || {};
  const winrate = s.winrate || 0;

  // circular gauge math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winrate / 100) * circumference;

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Back Button */}
      <Button 
        variant="text" 
        onClick={() => navigate('/')} 
        startIcon={<BackIcon />} 
        sx={{ color: '#94A3B8', mb: 3, '&:hover': { color: '#00E676' } }}
      >
        Retour au Dashboard
      </Button>

      {/* 👑 Coach Profile Header Card */}
      <Card sx={{ p: 4, borderRadius: 5, mb: 4 }}>
        <Grid container spacing={4} alignItems="center">
          
          {/* Avatar and name */}
          <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'rgba(0, 230, 118, 0.1)',
                border: '2px solid #00E676',
                boxShadow: '0 0 20px rgba(0, 230, 118, 0.2)'
              }}
            >
              <CoachIcon sx={{ color: '#00E676', fontSize: 44 }} />
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 1, lineHeight: 1.1 }}>
                {profile.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {profile.country && (
                  <Chip 
                    label={`🌍 ${profile.country}`} 
                    variant="outlined"
                    sx={{ fontWeight: 700, height: 22, fontSize: '0.65rem', borderColor: 'rgba(255,255,255,0.1)' }}
                  />
                )}
                <Chip 
                  label={`Coach ID: ${profile.id}`} 
                  size="small" 
                  sx={{ fontWeight: 800, height: 22, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)' }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Actions & Social Links */}
          <Grid item xs={12} md={5} sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
            {profile.twitch && (
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<TwitchIcon />}
                href={`https://twitch.tv/${profile.twitch}`}
                target="_blank"
                sx={{ borderRadius: 3, fontWeight: 700 }}
              >
                Twitch
              </Button>
            )}
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSyncCoach} 
              disabled={syncing}
              startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              {syncing ? 'Synchronisation...' : 'Synchroniser Fiche'}
            </Button>
          </Grid>

        </Grid>
      </Card>

      {/* Main Content Grid: Stats Dashboard (Left) & Teams/Matches (Right) */}
      <Grid container spacing={4}>
        
        {/* LEFT COLUMN: Spike-inspired Performance Dashboard */}
        <Grid item xs={12} lg={4.5}>
          
          {/* Winrate Circular Neon Gauge */}
          <Card sx={{ p: 4, borderRadius: 4, mb: 4, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, color: '#F8FAFC' }}>
              📊 Taux de Victoires Global
            </Typography>

            <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
              {/* SVG circular progress */}
              <svg width="140" height="140" viewBox="0 0 120 120">
                {/* Background circle */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.02)" 
                  strokeWidth="8" 
                />
                {/* Glowing neon green progress circle */}
                <circle 
                  cx="60" 
                  cy="60" 
                  r="50" 
                  fill="none" 
                  stroke="#00E676" 
                  strokeWidth="8" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 60 60)"
                  style={{
                    filter: 'drop-shadow(0px 0px 6px rgba(0, 230, 118, 0.6))',
                    transition: 'stroke-dashoffset 1s ease-in-out',
                  }}
                />
              </svg>
              {/* Centered winrate percentage text */}
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  bottom: 0, 
                  right: 0, 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', lineHeight: 1 }}>
                  {winrate.toFixed(0)}%
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mt: 0.5, letterSpacing: '0.05em' }}>
                  WINRATE
                </Typography>
              </Box>
            </Box>

            {/* Quick Metrics numbers row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%', pt: 2, borderTop: '1px solid rgba(255,255,255,0.03)' }}>
              <Box>
                <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>V</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>{s.wins}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>N</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>{s.draws}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 800 }}>D</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>{s.losses}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>TOTAL</Typography>
                <Typography variant="body1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>{s.totalMatches}</Typography>
              </Box>
            </Box>
          </Card>

          {/* Roster/Race Winrate Breakdown */}
          <Card sx={{ p: 4, borderRadius: 4 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, color: '#F8FAFC' }}>
              🥋 Performances par Roster
            </Typography>

            {(!stats.rosterUsage || stats.rosterUsage.length === 0) ? (
              <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center' }}>
                Aucune donnée de roster enregistrée.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {stats.rosterUsage.map((race: any) => {
                  const rInfo = getRaceInfo(race.raceId);
                  const raceMatches = race.matches || 0;
                  const raceWinrate = raceMatches > 0 
                    ? ((race.wins + race.draws * 0.5) / raceMatches) * 100 
                    : 0;

                  return (
                    <Box key={race.raceId}>
                      
                      {/* Name & Matches Count row */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#F8FAFC' }}>
                            {rInfo.name}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                          {raceMatches} match{raceMatches > 1 ? 's' : ''} ({race.wins}V - {race.draws}N - {race.losses}D)
                        </Typography>
                      </Box>

                      {/* Progress bar and winrate badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ flex: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={raceWinrate} 
                            sx={{ 
                              height: 6, 
                              borderRadius: 3, 
                              bgcolor: 'rgba(255,255,255,0.02)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: '#00E676',
                                borderRadius: 3,
                              }
                            }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#00E676', fontFamily: 'Outfit', minWidth: '40px', textAlign: 'right' }}>
                          {raceWinrate.toFixed(0)}%
                        </Typography>
                      </Box>

                    </Box>
                  );
                })}
              </Box>
            )}
          </Card>

        </Grid>

        {/* RIGHT COLUMN: Associated Teams & 5 Recent Matches */}
        <Grid item xs={12} lg={7.5}>
          
          {/* Tabs for switching between Teams and Recent Matches */}
          <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
            <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
              <Tab label={`Équipes (${profile.teams.length})`} sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
              <Tab label={`Matchs Récents (${recentMatches.length})`} sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
              <Tab label="Performances Cumulées" sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
            </Tabs>
          </Box>

          {/* TAB 0: Teams List */}
          {tabValue === 0 && (
            <Box>
              {profile.teams.length === 0 ? (
                <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
                  <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    Aucune équipe enregistrée pour ce coach.
                  </Typography>
                </Paper>
              ) : (
                <Grid container spacing={3}>
                  {profile.teams.map((team) => {
                    const rInfo = getRaceInfo(team.raceId);
                    return (
                      <Grid item xs={12} sm={6} key={team.id}>
                        <Card sx={{ borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.08) !important' }}>
                          <CardActionArea onClick={() => navigate(`/teams/${team.id}`)}>
                            <CardContent sx={{ p: 3 }}>
                              
                              {/* Logo, Name & Race */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar src={team.logo || undefined} sx={{ width: 44, height: 44, bgcolor: '#0B0F19' }}>🏈</Avatar>
                                <Box sx={{ overflow: 'hidden' }}>
                                  <Typography variant="subtitle1" noWrap sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC' }}>
                                    {team.name}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                                    {rInfo.name}
                                  </Typography>
                                </Box>
                              </Box>

                              <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.03)' }} />

                              {/* Value & players count */}
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Valeur d'Équipe</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#00E676', fontFamily: 'Outfit' }}>
                                    {(team.value / 1000).toFixed(0)}k TV
                                  </Typography>
                                </Box>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Bilan (V-N-D)</Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#94A3B8' }}>
                                    {team.wins}V - {team.draws}N - {team.losses}D
                                  </Typography>
                                </Box>
                              </Box>

                            </CardContent>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </Box>
          )}

          {/* TAB 1: 5 Recent Matches */}
          {tabValue === 1 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {recentMatches.length === 0 ? (
                <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
                  <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    Aucun match enregistré récemment.
                  </Typography>
                </Paper>
              ) : (
                recentMatches.map((match) => (
                  <Card key={match.id} sx={{ borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.08) !important' }}>
                    <CardActionArea onClick={() => navigate(`/matches/${match.id}`)}>
                      <CardContent sx={{ p: 3 }}>
                        
                        {/* Round & Date */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                            Journée {match.round} • {new Date(match.startedAt).toLocaleString()}
                          </Typography>
                          <Chip 
                            label={match.status} 
                            color={match.status === 'PLAYED' || match.status === 'VALIDATED' ? 'success' : 'default'}
                            size="small" 
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        </Box>

                        {/* Head-to-Head */}
                        <Grid container alignItems="center" spacing={1}>
                          <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar src={match.homeTeam.logo || undefined} sx={{ width: 34, height: 34, bgcolor: '#0B0F19' }}>🏈</Avatar>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                                {match.homeTeam.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                {match.homeCoach?.name || 'Inconnu'}
                              </Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={2} sx={{ textAlign: 'center' }}>
                            <Paper sx={{ py: 0.5, px: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2, display: 'inline-block' }}>
                              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900, lineHeight: 1 }}>
                                {match.homeScore} - {match.awayScore}
                              </Typography>
                            </Paper>
                          </Grid>

                          <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end', textAlign: 'right' }}>
                            <Box sx={{ overflow: 'hidden' }}>
                              <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                                {match.awayTeam.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                {match.awayCoach?.name || 'Inconnu'}
                              </Typography>
                            </Box>
                            <Avatar src={match.awayTeam.logo || undefined} sx={{ width: 34, height: 34, bgcolor: '#0B0F19' }}>🏈</Avatar>
                          </Grid>
                        </Grid>

                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))
              )}
            </Box>
          )}

          {/* TAB 2: Performance Statistics (Cumulative Player Stats) */}
          {tabValue === 2 && (
            <Card sx={{ p: 4, borderRadius: 4 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, color: '#F8FAFC' }}>
                🏅 Statistiques cumulées des Joueurs
              </Typography>
              
              <Grid container spacing={3.5}>
                
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Touchdowns Marqués</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>
                    {perf.touchdowns || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Passes Complétées</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#38BDF8' }}>
                    {perf.passes || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Yards à la Course</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>
                    {perf.yardsRunning || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Blocages Réussis</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#10B981' }}>
                    {perf.blocksSucceeded || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Armures Brisées</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#E11D48' }}>
                    {perf.armourBreaks || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Blessures Infligées</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EF4444' }}>
                    {perf.casualtiesInflicted || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>KOs Infligés</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EC4899' }}>
                    {perf.koInflicted || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Morts Causées 💀</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F8FAFC' }}>
                    {perf.deadInflicted || 0}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Morts Subies 💀</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EF4444' }}>
                    {perf.deadSustained || 0}
                  </Typography>
                </Grid>

              </Grid>
            </Card>
          )}

        </Grid>

      </Grid>

      {/* Snackbar notification for API actions */}
      <Snackbar 
        open={syncAlert?.open || false} 
        autoHideDuration={4000} 
        onClose={() => setSyncAlert(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={syncAlert?.severity || 'success'} sx={{ borderRadius: 3, fontWeight: 700 }}>
          {syncAlert?.message}
        </Alert>
      </Snackbar>

    </Box>
  );
};
