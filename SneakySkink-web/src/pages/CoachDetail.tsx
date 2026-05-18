import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  alpha,
  Button,
  Avatar,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import {
  Person as CoachIcon,
  CloudSync as SyncIcon,
  SportsSoccer as BallIcon,
  TrendingUp as WinrateIcon,
  Public as PublicIcon,
  EmojiEvents as TrophyIcon,
  Security as BlockIcon,
} from '@mui/icons-material';
import { api } from '../api';

const CoachDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [coachData, setCoachData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getCoach(id),
      api.getCoachStats(id)
    ])
      .then(([coachRes, statsRes]) => {
        setCoachData(coachRes);
        setStats(statsRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSync = async () => {
    if (!id) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await api.syncCoach(id);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
      // Ignore
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }

  if (!coachData) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Coach introuvable</Typography>
      </Box>
    );
  }

  const summary = stats?.summary || { totalMatches: 0, wins: 0, draws: 0, losses: 0, winrate: 0 };
  const perf = stats?.performance || {};

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: 'rgba(0,230,118,0.06)',
              border: '1px solid rgba(0,230,118,0.2)',
              color: '#00E676',
              fontWeight: 800,
              fontSize: '1.6rem',
            }}
          >
            {coachData.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5 }}>
              {coachData.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: '#64748B' }}>
              <PublicIcon sx={{ fontSize: 14 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {coachData.country || 'Inconnu'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Button
          onClick={handleSync}
          disabled={syncing}
          variant="outlined"
          startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <SyncIcon />}
          sx={{
            borderColor: syncSuccess ? '#00E676' : 'rgba(0,230,118,0.3)',
            color: '#00E676',
            bgcolor: 'rgba(0,230,118,0.04)',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2.5,
            px: 2.5,
            py: 1,
            '&:hover': {
              borderColor: '#00E676',
              bgcolor: 'rgba(0,230,118,0.08)',
            },
          }}
        >
          {syncing ? 'Synchronisation...' : syncSuccess ? 'Sync demandée !' : 'Synchroniser le Coach'}
        </Button>
      </Paper>

      {/* ─── Stats Grid ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Winrate */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Taux de Victoire
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#00E676', lineHeight: 1 }}>
              {summary.winrate}%
            </Typography>
          </Paper>
        </Grid>

        {/* Total Matches */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Matchs Joués
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#F8FAFC', lineHeight: 1 }}>
              {summary.totalMatches}
            </Typography>
          </Paper>
        </Grid>

        {/* W - D - L */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700 }}>{summary.wins} Victoires</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>{summary.draws} Nuls</Typography>
              <Typography variant="caption" sx={{ color: '#FF3D00', fontWeight: 700 }}>{summary.losses} Défaites</Typography>
            </Box>
            {/* Visual ratio bar */}
            <Box sx={{ height: 8, display: 'flex', borderRadius: 99, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Box sx={{ flex: summary.wins || 1, bgcolor: '#00E676' }} />
              <Box sx={{ flex: summary.draws || 1, bgcolor: '#94A3B8' }} />
              <Box sx={{ flex: summary.losses || 1, bgcolor: '#FF3D00' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Main Details ─── */}
      <Grid container spacing={3}>
        
        {/* Teams List */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              🛡️ Équipes de {coachData.name} ({coachData.teams?.length ?? 0})
            </Typography>

            {!coachData.teams || coachData.teams.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucune équipe enregistrée pour ce coach.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {coachData.teams.map((team: any) => (
                  <Paper
                    key={team.id}
                    onClick={() => navigate(`/equipe/${team.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid rgba(148,163,184,0.06)',
                      bgcolor: 'rgba(30,41,59,0.3)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '1px solid rgba(0,230,118,0.2)',
                        bgcolor: 'rgba(0,230,118,0.02)',
                        transform: 'translateX(4px)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrophyIcon sx={{ fontSize: 18, color: '#F59E0B' }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{team.name}</Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          TV {(team.value / 1000).toFixed(0)}k · {team.wins}V/{team.draws}N/{team.losses}D
                        </Typography>
                      </Box>
                    </Box>
                    <ArrowIcon sx={{ fontSize: 14, color: '#334155' }} />
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Coach Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              📊 Performance Globale
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Touchdowns marqués</TableCell>
                    <TableCell align="right" sx={{ color: '#00E676', fontWeight: 800 }}>{perf.touchdowns ?? 0}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Yards courus</TableCell>
                    <TableCell align="right" sx={{ color: '#F8FAFC', fontWeight: 800 }}>{perf.yardsRunning ?? 0}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Passes réussies</TableCell>
                    <TableCell align="right" sx={{ color: '#3B82F6', fontWeight: 800 }}>{perf.passes ?? 0}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Blocages infligés</TableCell>
                    <TableCell align="right" sx={{ color: '#A855F7', fontWeight: 800 }}>{perf.blocksSucceeded ?? 0}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Blessures infligées</TableCell>
                    <TableCell align="right" sx={{ color: '#F59E0B', fontWeight: 800 }}>{perf.casualtiesInflicted ?? 0}</TableCell>
                  </TableRow>
                  <TableRow sx={{ '& td': { borderBottom: 'none' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 600, py: 1 }}>Morts infligés</TableCell>
                    <TableCell align="right" sx={{ color: '#FF3D00', fontWeight: 800 }}>{perf.deadInflicted ?? 0}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default CoachDetail;
