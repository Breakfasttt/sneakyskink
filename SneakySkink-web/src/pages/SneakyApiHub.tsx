import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Grid,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  alpha,
  Divider,
  Button,
} from '@mui/material';
import {
  OfflineBolt as ApiIcon,
  MonitorHeart as MonitorIcon,
  IntegrationInstructions as DocIcon,
  PlayArrow as ActiveIcon,
  HourglassEmpty as WaitingIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  CloudQueue as DaemonIcon,
  CloudDone as CyanideIcon,
  Person as CoachIcon,
  EmojiEvents as LeagueIcon,
} from '@mui/icons-material';
import { api } from '../api';
import ApiDocs from './ApiDocs';

const SneakyApiHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [queueState, setQueueState] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchQueueDetails = async () => {
    try {
      const res = await api.getSyncQueue();
      setQueueState(res);
    } catch (err) {
      console.error('Erreur lors du rafraîchissement du statut du Harvester:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueueDetails();
    // Auto-update every 10 seconds
    const interval = setInterval(() => {
      setRefreshing(true);
      fetchQueueDetails();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const [cleaning, setCleaning] = useState<boolean>(false);

  const handleCleanQueue = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir effacer l'historique des requêtes (réussies et échouées) ?")) {
      return;
    }
    setCleaning(true);
    try {
      await api.cleanSyncQueue();
      await fetchQueueDetails();
    } catch (err) {
      console.error("Erreur lors du nettoyage de la file d'attente:", err);
    } finally {
      setCleaning(false);
    }
  };

  const getJobDisplayName = (job: any) => {
    const type = job.data?.type || '';
    const id = job.data?.id || job.id;

    if (type === 'fetch-coach') {
      return `Mise à jour Coach : ${id}`;
    }
    if (type === 'fetch-league') {
      return `Mise à jour Ligue : ${id}`;
    }
    if (type === 'fetch-competition') {
      return `Mise à jour Compétition : ${id}`;
    }

    // Fallbacks basés sur le nom du job si data.type est absent
    if (job.name?.startsWith('fetch-coach-')) {
      return `Mise à jour Coach : ${job.name.replace('fetch-coach-', '')}`;
    }
    if (job.name?.startsWith('fetch-league-')) {
      return `Mise à jour Ligue : ${job.name.replace('fetch-league-', '')}`;
    }
    if (job.name?.startsWith('fetch-competition-')) {
      return `Mise à jour Compétition : ${job.name.replace('fetch-competition-', '')}`;
    }

    return job.name || job.id;
  };

  const getJobIcon = (job: any) => {
    const type = job.data?.type || '';
    if (type === 'fetch-coach' || job.name?.includes('coach')) {
      return <CoachIcon sx={{ color: '#00E676' }} />;
    }
    return <LeagueIcon sx={{ color: '#F59E0B' }} />;
  };

  const q = queueState || {
    counts: { active: 0, waiting: 0, completed: 0, failed: 0 },
    harvesterRunning: false,
    cyanideOnline: false,
    cyanideStatus: 'DOWN',
    activeJobs: [],
    waitingJobs: [],
  };

  const counts = q.counts || { active: 0, waiting: 0, completed: 0, failed: 0 };
  const activeJobs = q.activeJobs || [];
  const waitingJobs = q.waitingJobs || [];

  return (
    <Box sx={{ py: 2 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ApiIcon sx={{ color: '#00E676', fontSize: 32 }} />
        </Paper>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', fontFamily: 'Outfit' }}>
            🔌 Hub SneakyAPI & SneakySync
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Consultez la documentation technique de l'API ou surveillez la file d'attente du module de synchronisation.
          </Typography>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTabs-indicator': { bgcolor: '#00E676' },
            '& .MuiTab-root': { color: '#94A3B8', fontWeight: 700, '&.Mui-selected': { color: '#00E676' } },
          }}
        >
          <Tab icon={<MonitorIcon fontSize="small" />} iconPosition="start" label="Moniteur SneakySync" />
          <Tab icon={<DocIcon fontSize="small" />} iconPosition="start" label="Documentation API & SDK" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <Box>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress sx={{ color: '#00E676' }} />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {/* Statuts Généraux */}
              <Grid item xs={12} md={4}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(148, 163, 184, 0.08)',
                    bgcolor: 'rgba(11, 15, 25, 0.6)',
                    backdropFilter: 'blur(10px)',
                    height: '100%',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    Statut Infrastructure
                  </Typography>

                  <List disablePadding>
                    <ListItem disableGutters sx={{ py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <DaemonIcon sx={{ color: q.harvesterRunning ? '#00E676' : '#EF4444' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="Module SneakySync"
                        secondary={q.harvesterRunning ? 'Actif & À l\'écoute' : 'Arrêté / Inactif'}
                        primaryTypographyProps={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem' }}
                        secondaryTypographyProps={{ color: q.harvesterRunning ? '#00E676' : '#EF4444', fontSize: '0.75rem' }}
                      />
                    </ListItem>

                    <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.06)' }} />

                    <ListItem disableGutters sx={{ py: 1.5 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <CyanideIcon sx={{
                          color: (q as any).cyanideStatus === 'OK'
                            ? '#00E676'
                            : (q as any).cyanideStatus === 'QUOTA_EXCEEDED'
                            ? '#F59E0B'
                            : '#EF4444'
                        }} />
                      </ListItemIcon>
                      <ListItemText
                        primary="API Officielle Cyanide"
                        secondary={
                          (q as any).cyanideStatus === 'OK'
                            ? 'En ligne / Accessible'
                            : (q as any).cyanideStatus === 'QUOTA_EXCEEDED'
                            ? 'Quota dépassé (En attente)'
                            : 'Inaccessible / Pas de réponse'
                        }
                        primaryTypographyProps={{ color: '#F8FAFC', fontWeight: 600, fontSize: '0.85rem' }}
                        secondaryTypographyProps={{
                          color: (q as any).cyanideStatus === 'OK'
                            ? '#00E676'
                            : (q as any).cyanideStatus === 'QUOTA_EXCEEDED'
                            ? '#F59E0B'
                            : '#EF4444',
                          fontSize: '0.75rem'
                        }}
                      />
                    </ListItem>
                  </List>
                </Paper>
              </Grid>

              {/* Requête en cours */}
              <Grid item xs={12} md={8}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(148, 163, 184, 0.08)',
                    bgcolor: 'rgba(11, 15, 25, 0.6)',
                    backdropFilter: 'blur(10px)',
                    mb: 3,
                    position: 'relative',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ActiveIcon sx={{ color: '#3B82F6' }} /> Requête en cours d'exécution
                    </Typography>
                    <Chip
                      size="small"
                      label={activeJobs.length > 0 ? 'ACTIF' : 'IDLE'}
                      sx={{
                        bgcolor: activeJobs.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(100, 116, 139, 0.1)',
                        color: activeJobs.length > 0 ? '#3B82F6' : '#94A3B8',
                        fontWeight: 900,
                        fontSize: '0.65rem',
                      }}
                    />
                  </Box>

                  {activeJobs.length === 0 ? (
                    <Box sx={{ py: 3, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        Aucun travail de synchronisation en cours d'exécution actuellement.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {activeJobs.map((job: any) => (
                        <ListItem key={job.id} disableGutters sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            {getJobIcon(job)}
                          </ListItemIcon>
                          <ListItemText
                            primary={getJobDisplayName(job)}
                            primaryTypographyProps={{ color: '#F8FAFC', fontWeight: 700, fontSize: '0.9rem' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>

                {/* Prochaines Requêtes en attente */}
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 3,
                    border: '1px solid rgba(148, 163, 184, 0.08)',
                    bgcolor: 'rgba(11, 15, 25, 0.6)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <WaitingIcon sx={{ color: '#F59E0B' }} /> Prochaines requêtes en attente (Max 10)
                    </Typography>
                    <Chip
                      size="small"
                      label={`${counts.waiting} en attente`}
                      sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 900, fontSize: '0.65rem' }}
                    />
                  </Box>

                  {waitingJobs.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 2 }}>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        La file d'attente est vide. Toutes les requêtes ont été traitées.
                      </Typography>
                    </Box>
                  ) : (
                    <List disablePadding>
                      {waitingJobs.map((job: any, idx: number) => (
                        <React.Fragment key={job.id}>
                          {idx > 0 && <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.05)' }} />}
                          <ListItem disableGutters sx={{ py: 1.5 }}>
                            <Box sx={{ mr: 2, minWidth: 20, textAlign: 'center' }}>
                              <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 800 }}>
                                #{idx + 1}
                              </Typography>
                            </Box>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              {getJobIcon(job)}
                            </ListItemIcon>
                            <ListItemText
                              primary={getJobDisplayName(job)}
                              primaryTypographyProps={{ color: '#E2E8F0', fontWeight: 600, fontSize: '0.85rem' }}
                            />
                          </ListItem>
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <ApiDocs />
        </Box>
      )}
    </Box>
  );
};

export default SneakyApiHub;
