/**
 * Page de détail d'une ligue.
 * Affiche les compétitions associées (avec filtre actif/inactif),
 * les statistiques clés de la ligue, les coachs participants et les derniers matchs joués.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  Switch,
  FormControlLabel,
  Avatar,
} from '@mui/material';
import {
  EmojiEvents as LeagueIcon,
  SportsSoccer as CompetitionIcon,
  CloudSync as SyncIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  CalendarToday as DateIcon,
  AccessTime as TimeIcon,
  ReportProblem as ForfeitIcon,
  SportsEsports as MatchIcon,
} from '@mui/icons-material';
import { api } from '../api';

const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [league, setLeague] = useState<any>(null);
  const [leagueStats, setLeagueStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showAllCompetitions, setShowAllCompetitions] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getLeague(id), api.getLeagueStats(id)])
      .then(([leagueRes, statsRes]) => {
        setLeague(leagueRes);
        setLeagueStats(statsRes);
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

  // Filtrer les compétitions (masquer les terminées/inactives si showAllCompetitions = false)
  const filteredCompetitions = useMemo(() => {
    if (!league?.competitions) return [];
    if (showAllCompetitions) return league.competitions;
    return league.competitions.filter(
      (comp: any) => comp.status === 'InProgress' || comp.status === 'Scheduled'
    );
  }, [league?.competitions, showAllCompetitions]);

  // Extraire les coachs uniques qui ont joué dans cette ligue
  const associatedCoaches = useMemo(() => {
    if (!leagueStats?.matches) return [];
    const coachesMap = new Map<string, { id: string; name: string }>();
    
    leagueStats.matches.forEach((m: any) => {
      if (m.homeCoachId && m.homeCoach?.name) {
        coachesMap.set(m.homeCoachId, { id: m.homeCoachId, name: m.homeCoach.name });
      }
      if (m.awayCoachId && m.awayCoach?.name) {
        coachesMap.set(m.awayCoachId, { id: m.awayCoachId, name: m.awayCoach.name });
      }
    });

    return Array.from(coachesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leagueStats?.matches]);

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

  const summary = leagueStats?.summary || { totalMatches: 0, forfeits: 0, coachesCount: 0, lastActivity: null };
  const recentMatches = leagueStats?.matches?.slice(0, 5) || [];

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* Hero Section */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 3,
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
                    {league.gamerCount ?? summary.coachesCount} coachs inscrits
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
            {syncing ? 'Synchronisation...' : syncSuccess ? 'Sync demandée !' : 'Synchroniser la Ligue'}
          </Button>
        </Box>
      </Paper>

      {/* Stats Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Matchs Joués
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <MatchIcon sx={{ fontSize: 20 }} /> {summary.totalMatches}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Coachs Actifs
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#00E676', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <PeopleIcon sx={{ fontSize: 20 }} /> {associatedCoaches.length || summary.coachesCount}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Forfaits / Concessions
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#FF3D00', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <ForfeitIcon sx={{ fontSize: 20 }} /> {summary.forfeits}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Dernier Match
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: '0.9rem', color: '#F8FAFC', py: 0.7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <TimeIcon sx={{ fontSize: 16, color: '#A855F7' }} />
              {summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString('fr-FR') : 'Aucun'}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        
        {/* Left Column: Competitions & Coaches */}
        <Grid item xs={12} md={7} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          
          {/* Competitions */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                🎯 Compétitions de la Ligue ({filteredCompetitions.length})
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showAllCompetitions}
                    onChange={(e) => setShowAllCompetitions(e.target.checked)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#00E676' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00E676' },
                    }}
                  />
                }
                label={<Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>Afficher terminées/inactives</Typography>}
              />
            </Box>

            {filteredCompetitions.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucune compétition correspondante.</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {filteredCompetitions.map((comp: any, index: number) => (
                  <React.Fragment key={comp.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton
                      onClick={() => navigate(`/competition/${comp.id}`)}
                      sx={{ py: 1.5, px: 1, borderRadius: 2, '&:hover': { bgcolor: 'rgba(0,230,118,0.04)' } }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.15)', ml: 0.5 }}>
                          <CompetitionIcon sx={{ fontSize: 16 }} />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={comp.name}
                        secondary={`${comp.teamsCount ?? 0}/${comp.teamsMax ?? '∞'} équipes · ${comp.format === 'Knockout' ? 'Phase finale' : 'Championnat'}`}
                        primaryTypographyProps={{ fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC' }}
                        secondaryTypographyProps={{ fontSize: '0.72rem', color: '#64748B', mt: 0.2 }}
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
                      <ArrowIcon sx={{ fontSize: 14, color: '#334155' }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          {/* Associated Coaches */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              👥 Coachs participants ({associatedCoaches.length})
            </Typography>

            {associatedCoaches.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucun coach n'a encore enregistré de match.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {associatedCoaches.map((coach) => (
                  <Chip
                    key={coach.id}
                    avatar={<Avatar sx={{ bgcolor: 'rgba(0,230,118,0.1)', color: '#00E676', fontSize: '0.7rem' }}>{coach.name.charAt(0).toUpperCase()}</Avatar>}
                    label={coach.name}
                    onClick={() => navigate(`/coach/${coach.id}`)}
                    sx={{
                      bgcolor: 'rgba(15,23,42,0.6)',
                      border: '1px solid rgba(148,163,184,0.1)',
                      color: '#F8FAFC',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#00E676',
                        bgcolor: 'rgba(0,230,118,0.04)',
                      }
                    }}
                  />
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Recent Matches */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
              ⚽ Matchs Récents
            </Typography>

            {recentMatches.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucun match disponible pour le moment.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentMatches.map((m: any) => (
                  <Paper
                    key={m.id}
                    onClick={() => navigate(`/match/${m.id}`)}
                    sx={{
                      p: 1.5,
                      borderRadius: 2.5,
                      border: '1px solid rgba(148,163,184,0.06)',
                      background: 'linear-gradient(135deg, rgba(30,41,59,0.2) 0%, rgba(15,23,42,0.2) 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#00E676',
                        transform: 'translateY(-1px)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
                        {m.competition?.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#475569' }}>
                        {new Date(m.startedAt).toLocaleDateString('fr-FR')}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                        <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.homeTeam?.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.homeCoach?.name || 'Inconnu'}
                        </Typography>
                      </Box>

                      <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 50, textAlign: 'center' }}>
                        <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '0.95rem' }}>
                          {m.homeScore} - {m.awayScore}
                        </Typography>
                      </Box>

                      <Box sx={{ flex: 1, minWidth: 0, pl: 1, textAlign: 'right' }}>
                        <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.awayTeam?.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.awayCoach?.name || 'Inconnu'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default LeagueDetail;
