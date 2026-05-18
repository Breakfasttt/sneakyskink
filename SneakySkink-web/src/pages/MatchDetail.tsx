import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  alpha,
  Avatar,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  SportsSoccer as MatchIcon,
  EmojiEvents as TrophyIcon,
  Person as CoachIcon,
  CalendarToday as DateIcon,
  Star as MvpIcon,
  SportsKabaddi as CasualtyIcon,
  PlayArrow as BallIcon,
} from '@mui/icons-material';
import { api } from '../api';

const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMatch(id)
      .then((data: any) => {
        setMatch(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }

  if (!match) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Match introuvable</Typography>
      </Box>
    );
  }

  // Aggregate stats from playerStats for both teams
  const homePlayerStats = (match.playerStats || []).filter((s: any) => s.teamId === match.homeTeamId);
  const awayPlayerStats = (match.playerStats || []).filter((s: any) => s.teamId === match.awayTeamId);

  const aggregateStat = (statsList: any[], field: string) => {
    return statsList.reduce((acc, curr) => acc + (curr[field] || 0), 0);
  };

  // Find MVPs
  const mvps = (match.playerStats || []).filter((s: any) => s.mvp === true);

  // Find scorers (TDs > 0)
  const scorers = (match.playerStats || []).filter((s: any) => s.touchdowns > 0);

  // Find violent players (Casualties > 0)
  const violence = (match.playerStats || []).filter((s: any) => s.casualtiesInflicted > 0);

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── League / Competition Breadcrumb Header ─── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
        <Chip
          icon={<TrophyIcon style={{ fontSize: 13, color: '#F59E0B' }} />}
          label={match.league?.name || 'Ligue'}
          onClick={() => navigate(`/ligue/${match.leagueId}`)}
          size="small"
          sx={{ bgcolor: 'rgba(245,158,11,0.06)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.15)', fontWeight: 600 }}
        />
        <Chip
          icon={<MatchIcon style={{ fontSize: 13, color: '#3B82F6' }} />}
          label={match.competition?.name || 'Compétition'}
          onClick={() => navigate(`/competition/${match.competitionId}`)}
          size="small"
          sx={{ bgcolor: 'rgba(59,130,246,0.06)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.15)', fontWeight: 600 }}
        />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B', ml: 'auto' }}>
          <DateIcon sx={{ fontSize: 13 }} />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {new Date(match.startedAt).toLocaleDateString('fr-FR')} à {new Date(match.startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        </Box>
      </Box>

      {/* ─── Match Board (Score & Teams) ─── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          borderRadius: 3.5,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(180deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 3,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          
          {/* Home Team */}
          <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'rgba(0,230,118,0.06)',
                border: '1px solid rgba(0,230,118,0.15)',
                color: '#00E676',
                mx: { xs: 'auto', sm: '0 0 0 auto' },
                mb: 1.5,
              }}
            >
              H
            </Avatar>
            <Typography
              onClick={() => navigate(`/equipe/${match.homeTeamId}`)}
              sx={{ fontWeight: 900, color: '#F8FAFC', fontSize: '1.2rem', cursor: 'pointer', '&:hover': { color: '#00E676' } }}
            >
              {match.homeTeam?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' }, gap: 0.5, mt: 0.5 }}>
              <CoachIcon sx={{ fontSize: 12 }} />
              {match.homeCoach?.name || 'Inconnu'}
            </Typography>
          </Grid>

          {/* Scoreboard */}
          <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ px: 4, py: 1.5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)' }}>
                <Typography sx={{ fontWeight: 950, fontSize: '2.5rem', color: '#00E676', letterSpacing: '0.1em', lineHeight: 1 }}>
                  {match.homeScore} - {match.awayScore}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Journée {match.round}
              </Typography>
            </Box>
          </Grid>

          {/* Away Team */}
          <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'rgba(168,85,247,0.06)',
                border: '1px solid rgba(168,85,247,0.15)',
                color: '#A855F7',
                mx: { xs: 'auto', sm: 'auto 0 0 0' },
                mb: 1.5,
              }}
            >
              A
            </Avatar>
            <Typography
              onClick={() => navigate(`/equipe/${match.awayTeamId}`)}
              sx={{ fontWeight: 900, color: '#F8FAFC', fontSize: '1.2rem', cursor: 'pointer', '&:hover': { color: '#00E676' } }}
            >
              {match.awayTeam?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 0.5, mt: 0.5 }}>
              <CoachIcon sx={{ fontSize: 12 }} />
              {match.awayCoach?.name || 'Inconnu'}
            </Typography>
          </Grid>

        </Grid>
      </Paper>

      {/* ─── Match Detailed Team Stats ─── */}
      <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3, textAlign: 'center' }}>
          📊 Statistiques des Équipes
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {[
            { label: 'Blocages réussis', field: 'blocksSucceeded' },
            { label: 'Yards courus', field: 'yardsRunning' },
            { label: 'Passes réussies', field: 'passes' },
            { label: 'Yards de passes', field: 'yardsPassing' },
            { label: 'Blessures infligées', field: 'casualtiesInflicted' },
            { label: 'Morts infligés', field: 'deadInflicted' },
          ].map((stat) => {
            const homeVal = aggregateStat(homePlayerStats, stat.field);
            const awayVal = aggregateStat(awayPlayerStats, stat.field);
            const total = homeVal + awayVal || 1;
            const homePct = (homeVal / total) * 100;

            return (
              <Box key={stat.label}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{homeVal}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{stat.label}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{awayVal}</Typography>
                </Box>
                <Box sx={{ height: 6, display: 'flex', borderRadius: 99, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)' }}>
                  <Box sx={{ width: `${homePct}%`, bgcolor: '#00E676' }} />
                  <Box sx={{ flex: 1, bgcolor: '#A855F7' }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* ─── Highlights (MVPs & Scorers) ─── */}
      <Grid container spacing={3}>
        
        {/* Scorers & Violent players */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              ⭐ Faits de Match
            </Typography>

            <List size="small" disablePadding>
              {mvps.map((s: any) => (
                <ListItem key={s.id} sx={{ py: 1, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><MvpIcon sx={{ color: '#F59E0B', fontSize: 18 }} /></ListItemIcon>
                  <ListItemText
                    primary={s.player?.name || `Joueur #${s.player?.number}`}
                    secondary={`MVP du match (${s.team?.name})`}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: '#F8FAFC' }}
                    secondaryTypographyProps={{ fontSize: '0.68rem', color: '#64748B' }}
                  />
                </ListItem>
              ))}
              
              {scorers.map((s: any) => (
                <ListItem key={s.id} sx={{ py: 1, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><BallIcon sx={{ color: '#3B82F6', fontSize: 18 }} /></ListItemIcon>
                  <ListItemText
                    primary={s.player?.name || `Joueur #${s.player?.number}`}
                    secondary={`A marqué ${s.touchdowns} Touchdown(s) (${s.team?.name})`}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: '#F8FAFC' }}
                    secondaryTypographyProps={{ fontSize: '0.68rem', color: '#64748B' }}
                  />
                </ListItem>
              ))}

              {violence.map((s: any) => (
                <ListItem key={s.id} sx={{ py: 1, px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}><CasualtyIcon sx={{ color: '#FF3D00', fontSize: 18 }} /></ListItemIcon>
                  <ListItemText
                    primary={s.player?.name || `Joueur #${s.player?.number}`}
                    secondary={`A infligé ${s.casualtiesInflicted} Sortie(s) (${s.team?.name})`}
                    primaryTypographyProps={{ fontWeight: 700, fontSize: '0.85rem', color: '#F8FAFC' }}
                    secondaryTypographyProps={{ fontSize: '0.68rem', color: '#64748B' }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Sync / Metadata Details */}
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              ⚙️ Informations Additionnelles
            </Typography>
            <List size="small" disablePadding>
              <ListItem sx={{ py: 1, px: 0, justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Identifiant du Match</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: '0.75rem' }}>{match.id}</Typography>
              </ListItem>
              <ListItem sx={{ py: 1, px: 0, justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Plateforme</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', textTransform: 'uppercase' }}>{match.platform}</Typography>
              </ListItem>
              <ListItem sx={{ py: 1, px: 0, justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Statut du match</Typography>
                <Chip label={match.status} size="small" sx={{ height: 20, bgcolor: 'rgba(0,230,118,0.08)', color: '#00E676', border: '1px solid rgba(0,230,118,0.15)', fontWeight: 700, fontSize: '0.6rem' }} />
              </ListItem>
            </List>
          </Paper>
        </Grid>

      </Grid>
    </Box>
  );
};

export default MatchDetail;
