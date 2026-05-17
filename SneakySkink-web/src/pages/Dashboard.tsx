import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Button,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  People as CoachIcon,
  SportsEsports as MatchIcon,
  GroupWork as TeamIcon,
  HourglassEmpty as CompIcon,
  FlashOn as ForfeitIcon,
  ArrowForward as ArrowForwardIcon,
  CloudSync as SyncIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { getRaceInfo } from '../utils/raceHelper';

interface DashboardStats {
  leagues: number;
  competitions: number;
  teams: number;
  coaches: number;
  matches: number;
}

interface PopularityItem {
  raceId: number;
  teamCount: number;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [queueCount, setQueueCount] = useState<{ active: number; waiting: number } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Call parallel stats APIs
        const [rootRes, globalRes, activityRes, queueRes] = await Promise.all([
          axios.get('http://localhost:3001/'),
          axios.get('http://localhost:3001/stats/global'),
          axios.get('http://localhost:3001/stats/activity'),
          axios.get('http://localhost:3001/sync/queue'),
        ]);

        setStats(rootRes.data.stats);
        setGlobalStats(globalRes.data);
        setActivityStats(activityRes.data);
        setQueueCount(queueRes.data);
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  // Calculate top races popularities
  const popularityList: PopularityItem[] = globalStats?.popularity?.racePopularity || [];
  const totalTeamsInPopularity = stats?.teams || 1;
  const topRaces = popularityList.slice(0, 5);

  const statsCards = [
    { label: 'Ligues', value: stats?.leagues || 0, icon: <TrophyIcon fontSize="large" style={{ color: '#00E676' }} />, path: '/leagues' },
    { label: 'Compétitions', value: stats?.competitions || 0, icon: <CompIcon fontSize="large" style={{ color: '#38BDF8' }} />, path: '/leagues' },
    { label: 'Équipes', value: stats?.teams || 0, icon: <TeamIcon fontSize="large" style={{ color: '#F59E0B' }} />, path: '/search' },
    { label: 'Coachs', value: stats?.coaches || 0, icon: <CoachIcon fontSize="large" style={{ color: '#A78BFA' }} />, path: '/search' },
    { label: 'Matchs', value: stats?.matches || 0, icon: <MatchIcon fontSize="large" style={{ color: '#FF3D00' }} />, path: '/search' },
  ];

  return (
    <Box sx={{ animation: 'fadeIn 0.5s ease-in-out' }}>
      {/* Hero Welcome banner */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '4px solid #00E676 !important',
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1, color: '#F8FAFC' }}>
            Tableau de Bord <span style={{ color: '#00E676' }}>SneakySkink</span>
          </Typography>
          <Typography variant="body1" sx={{ color: '#94A3B8', maxWidth: '700px', mb: 3 }}>
            L'outil ultime de visualisation et d'analyse des statistiques de Blood Bowl 3. Explorez les ligues, analysez les coachs, comparez les équipes et suivez la file d'aspiration en direct.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/leagues')}
              sx={{ fontWeight: 700 }}
            >
              Parcourir les Ligues
            </Button>
            <Button
              variant="outlined"
              color="inherit"
              onClick={() => navigate('/sync')}
              startIcon={<SyncIcon />}
              sx={{ borderColor: 'rgba(255, 255, 255, 0.2)', fontWeight: 700 }}
            >
              Lancer une Synchro
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Database Health Cards grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card) => (
          <Grid item xs={6} sm={4} md={2.4} key={card.label}>
            <Card
              className="hover-scale"
              onClick={() => navigate(card.path)}
              style={{ cursor: 'pointer', height: '100%' }}
            >
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ display: 'inline-flex', p: 1.5, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.02)', mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', mb: 0.5 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={4}>
        {/* Left Side: Popularity and Forfeits */}
        <Grid item xs={12} md={6}>
          {/* Race Popularity card */}
          <Card sx={{ mb: 4, height: 'calc(100% - 32px)' }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                🦎 Popularité des Races
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                {topRaces.map((item, idx) => {
                  const race = getRaceInfo(item.raceId);
                  const percentage = Math.round((item.teamCount / totalTeamsInPopularity) * 100);
                  return (
                    <Box key={item.raceId}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="h6" sx={{ fontSize: '1.25rem' }}>
                            {race.emoji}
                          </Typography>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {race.name}
                          </Typography>
                          <Chip
                            label={`#${idx + 1}`}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(255,255,255,0.05)',
                              color: '#94A3B8',
                              fontWeight: 700,
                              height: 20,
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                          {item.teamCount} éq. ({percentage}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'rgba(255,255,255,0.03)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 4,
                            bgcolor: race.color,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Sync status, Forfeit and activity summaries */}
        <Grid item xs={12} md={6}>
          {/* Crawling queue status */}
          <Card
            className="pulse-skink"
            sx={{
              mb: 4,
              border: queueCount && (queueCount.active > 0 || queueCount.waiting > 0) ? '1px solid rgba(0, 230, 118, 0.4) !important' : '1px solid rgba(148, 163, 184, 0.08) !important',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚡ File d'Attente de Synchronisation
                </Typography>
                <Chip
                  label={queueCount && (queueCount.active > 0 || queueCount.waiting > 0) ? 'Actif' : 'En veille'}
                  color={queueCount && (queueCount.active > 0 || queueCount.waiting > 0) ? 'success' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Le Harvester en tâche de fond aspire les données de l'API Cyanide de manière intelligente (Rate paced).
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>
                      {queueCount?.active || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                      Appels en cours
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>
                      {queueCount?.waiting || 0}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                      Appels en attente
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
              <Button
                variant="outlined"
                color="primary"
                fullWidth
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/sync')}
                sx={{ fontWeight: 700 }}
              >
                Gérer les Synchronisations
              </Button>
            </CardContent>
          </Card>

          {/* Forfeit stats card */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: 2,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255, 61, 0, 0.1)',
                  color: '#FF3D00',
                }}
              >
                <ForfeitIcon fontSize="large" />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 0.5 }}>
                  Taux de Concession
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, color: '#FF3D00', fontFamily: 'Outfit', mb: 0.5 }}>
                  {globalStats?.summary?.forfeitPercentage || 0}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                  Des matchs enregistrés se finissent par un forfait/concession ({globalStats?.summary?.forfeits || 0} sur {globalStats?.summary?.totalMatches || 0} matchs).
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
