import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  alpha,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  CloudSync as SyncIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  PlayArrow as ActiveIcon,
  HourglassEmpty as WaitingIcon,
} from '@mui/icons-material';
import { api } from '../api';

const Sync: React.FC = () => {
  const [queueState, setQueueState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQueue = async () => {
    try {
      const data = await api.getSyncQueue();
      setQueueState(data);
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 5 seconds
    const timer = setInterval(() => {
      setRefreshing(true);
      fetchQueue();
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }

  const q = queueState?.counts || { active: 0, waiting: 0, completed: 0, failed: 0 };

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── Header ─── */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            ⚡ SneakySync
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Suivez en temps réel l'état des jobs de synchronisation dans la file d'attente BullMQ.
          </Typography>
        </Box>
        {refreshing && <CircularProgress size={16} sx={{ color: '#00E676' }} />}
      </Box>

      {/* ─── Queue Cards ─── */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        
        {/* Active Jobs */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(59,130,246,0.15)', bgcolor: 'rgba(59,130,246,0.04)', textAlign: 'center' }}>
            <ActiveIcon sx={{ color: '#3B82F6', mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>En cours</Typography>
            <Typography sx={{ fontWeight: 900, color: '#3B82F6', fontSize: '1.8rem' }}>{q.active}</Typography>
          </Paper>
        </Grid>

        {/* Waiting Jobs */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(245,158,11,0.15)', bgcolor: 'rgba(245,158,11,0.04)', textAlign: 'center' }}>
            <WaitingIcon sx={{ color: '#F59E0B', mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>En attente</Typography>
            <Typography sx={{ fontWeight: 900, color: '#F59E0B', fontSize: '1.8rem' }}>{q.waiting}</Typography>
          </Paper>
        </Grid>

        {/* Completed Jobs */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(0,230,118,0.15)', bgcolor: 'rgba(0,230,118,0.04)', textAlign: 'center' }}>
            <SuccessIcon sx={{ color: '#00E676', mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>Complétés</Typography>
            <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '1.8rem' }}>{q.completed}</Typography>
          </Paper>
        </Grid>

        {/* Failed Jobs */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(255,61,0,0.15)', bgcolor: 'rgba(255,61,0,0.04)', textAlign: 'center' }}>
            <ErrorIcon sx={{ color: '#FF3D00', mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, display: 'block' }}>Échoués</Typography>
            <Typography sx={{ fontWeight: 900, color: '#FF3D00', fontSize: '1.8rem' }}>{q.failed}</Typography>
          </Paper>
        </Grid>

      </Grid>

      {/* ─── Operations Details ─── */}
      <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
          ℹ️ Fonctionnement de SneakySync
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, lineHeight: 1.6 }}>
          SneakySync utilise une stratégie de synchronisation <strong>Delta-sync</strong> pour optimiser le quota d'API de Cyanide. 
          Il requête uniquement les données produites depuis le dernier match enregistré en base de données.
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, lineHeight: 1.6 }}>
          Toutes les demandes de synchronisation manuelle passées via les profils de ligues ou de coachs sont gérées de manière asynchrone par BullMQ. 
          Cela évite les surcharges et garantit la persistance des données en cas de panne de l'API de Cyanide.
        </Typography>
      </Paper>

    </Box>
  );
};

export default Sync;
