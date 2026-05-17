import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CloudSync as SyncIcon,
  People as CoachIcon,
  EmojiEvents as TrophyIcon,
  HourglassEmpty as QueueIcon,
  DoneAll as DoneIcon,
} from '@mui/icons-material';
import { api } from '../api';

export const SyncManager: React.FC = () => {
  const [queue, setQueue] = useState<{ active: number; waiting: number; completed?: number } | null>(null);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);
  
  // Form inputs
  const [coachId, setCoachId] = useState<string>('');
  const [leagueId, setLeagueId] = useState<string>('');
  const [syncingCoach, setSyncingCoach] = useState<boolean>(false);
  const [syncingLeague, setSyncingLeague] = useState<boolean>(false);

  // Notifications
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' } | null>(null);

  const fetchQueue = async () => {
    try {
      const data = await api.getSyncQueue();
      setQueue(data);
    } catch (err) {
      console.error('Failed to load queue status', err);
    } finally {
      setLoadingQueue(false);
    }
  };

  // Poll queue status every 3 seconds for real-time visualization
  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSyncCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coachId.trim()) return;

    setSyncingCoach(true);
    try {
      const res = await api.syncCoach(coachId.trim());
      setNotification({
        open: true,
        message: `Coach synchronisé avec succès ! Job BullMQ en cours... (ID: ${res.jobId})`,
        severity: 'success',
      });
      setCoachId('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      setNotification({
        open: true,
        message: 'Erreur lors du lancement de la synchronisation de ce coach.',
        severity: 'error',
      });
    } finally {
      setSyncingCoach(false);
    }
  };

  const handleSyncLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leagueId.trim()) return;

    setSyncingLeague(true);
    try {
      const res = await api.syncLeague(leagueId.trim());
      setNotification({
        open: true,
        message: `Ligue en cours de synchronisation globale ! Tous les matchs et compétitions vont être importés. (ID: ${res.jobId})`,
        severity: 'success',
      });
      setLeagueId('');
      fetchQueue();
    } catch (err) {
      console.error(err);
      setNotification({
        open: true,
        message: 'Erreur lors de la synchronisation de cette ligue.',
        severity: 'error',
      });
    } finally {
      setSyncingLeague(false);
    }
  };

  const isQueueActive = queue && (queue.active > 0 || queue.waiting > 0);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1 }}>
        ⚡ Centre de Synchronisation
      </Typography>
      <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
        Envoyez de nouveaux jobs d'aspiration en tâche de fond vers la file BullMQ et suivez le traitement en temps réel.
      </Typography>

      <Grid container spacing={4}>
        {/* Left Side: Real-time status */}
        <Grid item xs={12} md={6}>
          <Card
            className={isQueueActive ? 'pulse-skink' : ''}
            sx={{
              mb: 4,
              border: isQueueActive ? '1px solid rgba(0, 230, 118, 0.4) !important' : '1px solid rgba(148, 163, 184, 0.08) !important',
              height: '100%',
            }}
          >
            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                🎯 Statut de la File Harvester
              </Typography>

              {loadingQueue ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ flexGrow: 1 }}>
                  <Grid container spacing={2} sx={{ mb: 4 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center', borderRadius: 3 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#00E676', fontFamily: 'Outfit' }}>
                          {queue?.active || 0}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, mt: 1 }}>
                          En cours (Active)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.02)', textAlign: 'center', borderRadius: 3 }}>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: '#F59E0B', fontFamily: 'Outfit' }}>
                          En attente (Queue)
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, mt: 1 }}>
                          Jobs en attente
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 3, bgcolor: 'rgba(255,255,255,0.04)' }} />

                  {/* Informative alert */}
                  <Alert
                    severity={isQueueActive ? 'success' : 'info'}
                    icon={isQueueActive ? <CircularProgress size={20} color="inherit" /> : <DoneIcon />}
                    sx={{
                      borderRadius: 3,
                      bgcolor: isQueueActive ? 'rgba(0, 230, 118, 0.08)' : 'rgba(56, 189, 248, 0.05)',
                      color: isQueueActive ? '#00E676' : '#38BDF8',
                      '& .MuiAlert-icon': {
                        color: 'inherit',
                      },
                    }}
                  >
                    {isQueueActive
                      ? 'Le démon Harvester traite actuellement des requêtes Cyanide avec un Rate Pacer intelligent (2.5s).'
                      : 'Aucun job en cours. Le Harvester est en veille.'}
                  </Alert>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Enqueue forms */}
        <Grid item xs={12} md={6}>
          {/* Synchronize Coach form */}
          <Card sx={{ mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🦎 Synchroniser un Coach
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Renseignez le pseudo ou l'ID Cyanide exact du coach pour récupérer et parser toutes ses équipes et son historique de match récent.
              </Typography>

              <form onSubmit={handleSyncCoach}>
                <Grid container spacing={2}>
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="Pseudo ou ID du Coach..."
                      value={coachId}
                      onChange={(e) => setCoachId(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.02)',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={syncingCoach || !coachId.trim()}
                      startIcon={syncingCoach ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                      sx={{ height: '40px', fontWeight: 700 }}
                    >
                      Lancer
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>

          {/* Synchronize League form */}
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                🏆 Synchroniser une Ligue Globale
              </Typography>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Renseignez l'UUID de la ligue Blood Bowl 3 pour lancer une aspiration en cascade de toutes les compétitions, effectifs d'équipes et matchs associés.
              </Typography>

              <form onSubmit={handleSyncLeague}>
                <Grid container spacing={2}>
                  <Grid item xs={8}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="ID de la Ligue..."
                      value={leagueId}
                      onChange={(e) => setLeagueId(e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 3,
                          bgcolor: 'rgba(255,255,255,0.02)',
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={4}>
                    <Button
                      fullWidth
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={syncingLeague || !leagueId.trim()}
                      startIcon={syncingLeague ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                      sx={{ height: '40px', fontWeight: 700 }}
                    >
                      Lancer
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Notifications Snackbar */}
      {notification && (
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={() => setNotification(null)} severity={notification.severity} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
};
