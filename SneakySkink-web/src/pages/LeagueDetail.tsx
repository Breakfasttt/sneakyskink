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
  Chip,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as LeagueIcon,
  SportsSoccer as CompetitionIcon,
  CloudSync as SyncIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { api } from '../api';

const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getLeague(id)
      .then((data) => {
        setLeague(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleSync = async () => {
    if (!id) return;
    setSyncing(true);
    setSyncSuccess(false);
    try {
      await api.syncLeague(id);
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

  if (!league) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Ligue introuvable</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 4,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3, alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: 2.5,
                bgcolor: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.15)',
                color: '#F59E0B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <LeagueIcon sx={{ fontSize: 36 }} />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5 }}>
                {league.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Chip
                  label={league.active ? 'Active' : 'Inactive'}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: league.active ? 'rgba(0,230,118,0.08)' : 'rgba(148,163,184,0.08)',
                    color: league.active ? '#00E676' : '#94A3B8',
                    border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                  }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                  <PeopleIcon sx={{ fontSize: 13 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {league.gamerCount ?? 0} coachs inscrits
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          <Button
            onClick={handleSync}
            disabled={syncing || !league.active}
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : <SyncIcon />}
            sx={{
              borderColor: syncSuccess ? '#00E676' : 'rgba(0,230,118,0.3)',
              color: syncSuccess ? '#00E676' : '#00E676',
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
            {syncing ? 'Synchronisation...' : syncSuccess ? 'Sync demandée !' : 'Synchroniser la Ligue'}
          </Button>
        </Box>
      </Paper>

      {/* Main Content */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              border: '1px solid rgba(148,163,184,0.08)',
              borderRadius: 3,
              bgcolor: 'rgba(15,23,42,0.4)',
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              🎯 Compétitions de la Ligue ({league.competitions?.length ?? 0})
            </Typography>

            {!league.competitions || league.competitions.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucune compétition trouvée dans cette ligue.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {league.competitions.map((comp: any, index: number) => (
                  <React.Fragment key={comp.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton
                      onClick={() => navigate(`/competition/${comp.id}`)}
                      sx={{ py: 2, px: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,230,118,0.04)' } }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.15)', ml: 0.5 }}>
                          <CompetitionIcon sx={{ fontSize: 16, margin: 'auto' }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={comp.name}
                        secondary={`${comp.teamsCount ?? 0}/${comp.teamsMax ?? '∞'} équipes · format ${comp.format || 'Championnat'}`}
                        primaryTypographyProps={{ fontWeight: 700, fontSize: '0.92rem', color: '#F8FAFC' }}
                        secondaryTypographyProps={{ fontSize: '0.72rem', color: '#64748B', mt: 0.25 }}
                      />
                      <Chip
                        label={comp.status === 'InProgress' ? 'En cours' : comp.status === 'Scheduled' ? 'Planifiée' : 'Terminée'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.58rem',
                          fontWeight: 700,
                          bgcolor: comp.status === 'InProgress' ? 'rgba(59,130,246,0.08)' : 'rgba(148,163,184,0.08)',
                          color: comp.status === 'InProgress' ? '#3B82F6' : '#94A3B8',
                          mr: 2,
                        }}
                      />
                      <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LeagueDetail;
