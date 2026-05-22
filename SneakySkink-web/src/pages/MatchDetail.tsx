/**
 * Page de détail d'un match.
 * Affiche le tableau d'affichage, les statistiques comparatives des équipes
 * et une chronologie verticale visuelle des événements clés du match dérivés des statistiques des joueurs.
 */

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
  Chip,
  Tabs,
  Tab,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import {
  SportsSoccer as MatchIcon,
  EmojiEvents as TrophyIcon,
  Person as CoachIcon,
  CalendarToday as DateIcon,
  Refresh as SyncIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getMatch(id)
      .then((data: any) => {
        setMatch(data);
      })
      .catch((err) => {
        console.error('Erreur lors du chargement du match:', err);
      })
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

  const homeRaceInfo = getRaceInfo(match.homeTeam?.raceId);
  const awayRaceInfo = getRaceInfo(match.awayTeam?.raceId);

  const homePlayerStats = match.homeTeam?.players || [];
  const awayPlayerStats = match.awayTeam?.players || [];

  const getPlayerStat = (p: any, field: string) => {
    if (field === 'casualtiesSustained') {
      return p.casualtiesSustained || (p.newCasualties ? p.newCasualties.length : 0);
    }
    if (field === 'deadSustained') {
      return p.deadSustained || (p.newCasualties && p.newCasualties.includes('dead') ? 1 : 0);
    }
    return p[field] || 0;
  };

  const aggregateStat = (statsList: any[], field: string, opposingStatsList: any[] = []) => {
    if (field === 'casualtiesInflicted') {
      const dbSum = statsList.reduce((acc, curr) => acc + (curr.casualtiesInflicted || 0), 0);
      if (dbSum === 0 && opposingStatsList.length > 0) {
        return opposingStatsList.reduce((acc, curr) => acc + getPlayerStat(curr, 'casualtiesSustained'), 0);
      }
      return dbSum;
    }
    if (field === 'deadInflicted') {
      const dbSum = statsList.reduce((acc, curr) => acc + (curr.deadInflicted || 0), 0);
      if (dbSum === 0 && opposingStatsList.length > 0) {
        return opposingStatsList.reduce((acc, curr) => acc + getPlayerStat(curr, 'deadSustained'), 0);
      }
      return dbSum;
    }
    if (field === 'koInflicted') {
      const dbSum = statsList.reduce((acc, curr) => acc + (curr.koInflicted || 0), 0);
      if (dbSum === 0 && opposingStatsList.length > 0) {
        return opposingStatsList.reduce((acc, curr) => acc + (curr.koSustained || 0), 0);
      }
      return dbSum;
    }
    return statsList.reduce((acc, curr) => acc + getPlayerStat(curr, field), 0);
  };

  // Extraction et tri des événements marquants pour la timeline
  const events: any[] = [];

  const extractEvents = (players: any[], isHome: boolean, teamColor: string, teamName: string) => {
    players.forEach((p: any) => {
      // 1. Touchdowns
      if (p.touchdowns > 0) {
        events.push({
          type: 'touchdown',
          label: 'Touchdown',
          icon: '🏈',
          color: '#00E676',
          text: `A marqué ${p.touchdowns} Touchdown(s).`,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 2. Morts subis
      if (p.deadSustained > 0) {
        events.push({
          type: 'dead_sustained',
          label: 'Mort',
          icon: '💀',
          color: '#EF4444',
          text: 'A succombé à ses blessures sur le terrain.',
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 3. Blessures subies
      else if ((p.newCasualties && p.newCasualties.length > 0) || p.casualtiesSustained > 0) {
        const casualtyText = p.newCasualties && p.newCasualties.length > 0
          ? `Blessure subie : ${p.newCasualties.join(', ')}`
          : 'Blessure subie sur le terrain.';
        events.push({
          type: 'casualty_sustained',
          label: 'Blessure',
          icon: '🤕',
          color: '#F43F5E',
          text: casualtyText,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 4. Sorties infligées (casualties)
      if (p.casualtiesInflicted > 0) {
        events.push({
          type: 'casualty_inflicted',
          label: 'Sortie',
          icon: '💥',
          color: '#D97706',
          text: `A infligé ${p.casualtiesInflicted} sortie(s) (${p.injuriesInflicted || 0} blessure(s), ${p.deadInflicted || 0} mort(s)).`,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 4b. KO infligés
      if (p.koInflicted > 0) {
        events.push({
          type: 'ko_inflicted',
          label: 'KO',
          icon: '🥊',
          color: '#EAB308',
          text: `A infligé ${p.koInflicted} KO(s).`,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 4c. Surfs infligés
      if (p.pushouts > 0) {
        events.push({
          type: 'pushout',
          label: 'Surf',
          icon: '🌊',
          color: '#06B6D4',
          text: `A poussé ${p.pushouts} adversaire(s) dans le public.`,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 4d. Expulsions subies
      if (p.sustainedExpulsions > 0) {
        events.push({
          type: 'expulsion',
          label: 'Expulsion',
          icon: '🟥',
          color: '#EF4444',
          text: 'A été expulsé du terrain par l\'arbitre.',
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 5. Interceptions
      if (p.interceptions > 0) {
        events.push({
          type: 'interception',
          label: 'Interception',
          icon: '🛡️',
          color: '#A855F7',
          text: 'A intercepté le ballon adverse.',
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 6. Passes
      if (p.passes > 0) {
        events.push({
          type: 'pass',
          label: 'Passe',
          icon: '🎯',
          color: '#3B82F6',
          text: `A réussi ${p.passes} passe(s) pour ${p.yardsPassing || 0} yards.`,
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
      // 7. MVP
      if (p.mvp) {
        events.push({
          type: 'mvp',
          label: 'MVP',
          icon: '⭐',
          color: '#F59E0B',
          text: 'Élu meilleur joueur du match (MVP).',
          isHome,
          teamColor,
          teamName,
          playerName: p.name || `Joueur #${p.number}`,
          playerNumber: p.number,
          playerType: p.type,
        });
      }
    });
  };

  extractEvents(homePlayerStats, true, homeRaceInfo.color, match.homeTeam?.name);
  extractEvents(awayPlayerStats, false, awayRaceInfo.color, match.awayTeam?.name);

  // Tri des événements par ordre de dramaturgie
  const eventPriority: Record<string, number> = {
    touchdown: 1,
    dead_sustained: 2,
    casualty_sustained: 3,
    casualty_inflicted: 4,
    ko_inflicted: 5,
    pushout: 6,
    expulsion: 7,
    interception: 8,
    pass: 9,
    mvp: 10
  };
  events.sort((a, b) => (eventPriority[a.type] || 99) - (eventPriority[b.type] || 99));

  const formattedUpdateDate = match.updatedAt
    ? new Date(match.updatedAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Inconnue';

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── League / Competition Breadcrumb Header ─── */}
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3, alignItems: 'center' }}>
        <Chip
          icon={<TrophyIcon style={{ fontSize: 13, color: '#F59E0B' }} />}
          label={match.leagueName || 'Ligue'}
          onClick={() => navigate(`/ligue/${match.leagueId}`)}
          size="small"
          sx={{ bgcolor: 'rgba(245,158,11,0.06)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.15)', fontWeight: 600 }}
        />
        <Chip
          icon={<MatchIcon style={{ fontSize: 13, color: '#3B82F6' }} />}
          label={match.competitionName || 'Compétition'}
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
                width: 64,
                height: 64,
                bgcolor: alpha(homeRaceInfo.color, 0.1),
                border: `2px solid ${homeRaceInfo.color}`,
                mx: { xs: 'auto', sm: '0 0 0 auto' },
                mb: 1.5,
                boxShadow: `0 0 10px ${alpha(homeRaceInfo.color, 0.2)}`,
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{homeRaceInfo.emoji}</span>
            </Avatar>
            <Typography
              onClick={() => navigate(`/equipe/${match.homeTeam.id}`)}
              sx={{ fontWeight: 950, color: '#F8FAFC', fontSize: '1.3rem', cursor: 'pointer', '&:hover': { color: homeRaceInfo.color } }}
            >
              {match.homeTeam?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' }, gap: 0.5, mt: 0.5 }}>
              <CoachIcon sx={{ fontSize: 12 }} />
              {match.homeTeam?.coach?.name || 'Inconnu'}
            </Typography>
          </Grid>

          {/* Scoreboard */}
          <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ display: 'inline-flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
              <Box sx={{ px: 4, py: 1.5, borderRadius: 3, bgcolor: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)' }}>
                <Typography sx={{ fontWeight: 950, fontSize: '2.8rem', color: '#00E676', letterSpacing: '0.1em', lineHeight: 1 }}>
                  {match.homeTeam?.score} - {match.awayTeam?.score}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Journée {match.round}
              </Typography>
              {match.isForfeit && (
                <Chip
                  label={
                    match.forfeitTeamId 
                      ? `FORFAIT : ${match.forfeitTeamId === match.homeTeam.id ? match.homeTeam.name : match.awayTeam.name}` 
                      : "DOUBLE FORFAIT"
                  }
                  size="small"
                  sx={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                    color: '#EF4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    fontSize: '0.65rem',
                    py: 0.5,
                  }}
                />
              )}
              {match.isPenalties && (
                <Chip
                  label="TIRS AU BUT"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    bgcolor: 'rgba(59, 130, 246, 0.08)',
                    color: '#3B82F6',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    fontSize: '0.65rem',
                    py: 0.5,
                  }}
                />
              )}
            </Box>
          </Grid>

          {/* Away Team */}
          <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: alpha(awayRaceInfo.color, 0.1),
                border: `2px solid ${awayRaceInfo.color}`,
                mx: { xs: 'auto', sm: 'auto 0 0 0' },
                mb: 1.5,
                boxShadow: `0 0 10px ${alpha(awayRaceInfo.color, 0.2)}`,
              }}
            >
              <span style={{ fontSize: '1.8rem' }}>{awayRaceInfo.emoji}</span>
            </Avatar>
            <Typography
              onClick={() => navigate(`/equipe/${match.awayTeam.id}`)}
              sx={{ fontWeight: 950, color: '#F8FAFC', fontSize: '1.3rem', cursor: 'pointer', '&:hover': { color: awayRaceInfo.color } }}
            >
              {match.awayTeam?.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-start' }, gap: 0.5, mt: 0.5 }}>
              <CoachIcon sx={{ fontSize: 12 }} />
              {match.awayTeam?.coach?.name || 'Inconnu'}
            </Typography>
          </Grid>

        </Grid>
      </Paper>

      <Grid container spacing={3}>
        
        {/* ─── Left Column: Vertical Event Timeline ─── */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
              🏈 Événements Majeurs & Faits de Match
            </Typography>

            {events.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucun événement marquant enregistré pour ce match.</Typography>
              </Box>
            ) : (
              <Box sx={{ position: 'relative', pl: 3.5, borderLeft: '2px dashed rgba(148,163,184,0.1)', ml: 1.5 }}>
                {events.map((event, idx) => (
                  <Box key={idx} sx={{ position: 'relative', mb: 3, '&:last-child': { mb: 0 } }}>
                    {/* Bullet */}
                    <Box
                      sx={{
                        position: 'absolute',
                        left: -37,
                        top: 6,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: event.teamColor,
                        border: '3px solid #0B1329',
                        boxShadow: `0 0 8px ${event.teamColor}`,
                      }}
                    />
                    
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(event.teamColor, 0.15)}`,
                        bgcolor: 'rgba(15,23,42,0.4)',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: event.teamColor,
                          boxShadow: `0 0 10px ${alpha(event.teamColor, 0.05)}`,
                          transform: 'translateX(3px)',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="caption" sx={{ color: event.teamColor, fontWeight: 800 }}>
                          {event.teamName}
                        </Typography>
                        <Chip
                          label={event.label}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.55rem',
                            fontWeight: 800,
                            bgcolor: alpha(event.color, 0.1),
                            color: event.color,
                            border: `1px solid ${alpha(event.color, 0.2)}`,
                          }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                        <span style={{ fontSize: '1.3rem' }}>{event.icon}</span>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {event.playerName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
                            N°{event.playerNumber} · {event.playerType}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.82rem' }}>
                            {event.text}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* ─── Right Column: Team Stats & Additional Info ─── */}
        <Grid item xs={12} md={5} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Detailed Stats */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
              📊 Comparatif de Match
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {[
                { label: 'Blocages réussis', field: 'blocksSucceeded' },
                { label: 'Yards courus', field: 'yardsRunning' },
                { label: 'Passes réussies', field: 'passes' },
                { label: 'Yards de passes', field: 'yardsPassing' },
                { label: 'Blessures infligées', field: 'casualtiesInflicted' },
                { label: 'Blessures subies', field: 'casualtiesSustained' },
                { label: 'KOs infligés', field: 'koInflicted' },
                { label: 'KOs subis', field: 'koSustained' },
                { label: 'Morts infligés', field: 'deadInflicted' },
                { label: 'Morts subis', field: 'deadSustained' },
                { label: 'Surfs (public)', field: 'pushouts' },
                { label: 'Expulsions subies', field: 'sustainedExpulsions' },
                { label: 'XP gagnés', field: 'xpGained' },
              ].map((stat) => {
                const homeVal = aggregateStat(homePlayerStats, stat.field, awayPlayerStats);
                const awayVal = aggregateStat(awayPlayerStats, stat.field, homePlayerStats);
                const total = homeVal + awayVal;
                const homePct = total > 0 ? (homeVal / total) * 100 : 0;
                const showBar = total > 0;

                return (
                  <Box key={stat.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: homeRaceInfo.color }}>{homeVal}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>{stat.label}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: awayRaceInfo.color }}>{awayVal}</Typography>
                    </Box>
                    <Box sx={{ height: 6, display: 'flex', borderRadius: 99, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)' }}>
                      {showBar && <Box sx={{ width: `${homePct}%`, bgcolor: homeRaceInfo.color }} />}
                      {showBar && <Box sx={{ flex: 1, bgcolor: awayRaceInfo.color }} />}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* Sync / Metadata Details */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              ⚙️ Informations Synchronisation
            </Typography>
            <List size="small" disablePadding>
              <ListItem sx={{ py: 1.2, px: 0, justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Identifiant Match</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', fontFamily: 'monospace', fontSize: '0.75rem' }}>{match.id}</Typography>
              </ListItem>
              <ListItem sx={{ py: 1.2, px: 0, justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Plateforme</Typography>
                <Typography variant="body2" sx={{ color: '#F8FAFC', textTransform: 'uppercase', fontWeight: 700 }}>{match.platform}</Typography>
              </ListItem>
              <ListItem sx={{ py: 1.2, px: 0, justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Dernière Synchronisation</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#F8FAFC' }}>
                  <SyncIcon sx={{ fontSize: 13, color: '#00E676' }} />
                  <Typography variant="body2">{formattedUpdateDate}</Typography>
                </Box>
              </ListItem>
              <ListItem sx={{ py: 1.2, px: 0, justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>Statut</Typography>
                <Chip label={match.status} size="small" sx={{ height: 20, bgcolor: 'rgba(0,230,118,0.08)', color: '#00E676', border: '1px solid rgba(0,230,118,0.15)', fontWeight: 700, fontSize: '0.6rem' }} />
              </ListItem>
            </List>
          </Paper>
        </Grid>

      </Grid>

      {/* ─── Player Statistics Tables ─── */}
      <Paper
        sx={{
          p: 3,
          mt: 4,
          border: '1px solid rgba(148,163,184,0.08)',
          borderRadius: 3.5,
          bgcolor: 'rgba(15,23,42,0.4)',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
          🏃 Statistiques Individuelles des Joueurs
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            mb: 2,
            borderBottom: '1px solid rgba(148,163,184,0.08)',
            '& .MuiTab-root': {
              color: '#64748B',
              fontWeight: 700,
              '&.Mui-selected': {
                color: activeTab === 0 ? homeRaceInfo.color : awayRaceInfo.color,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: activeTab === 0 ? homeRaceInfo.color : awayRaceInfo.color,
            },
          }}
        >
          <Tab label={match.homeTeam?.name || 'Équipe Domicile'} />
          <Tab label={match.awayTeam?.name || 'Équipe Extérieur'} />
        </Tabs>

        <TableContainer sx={{ maxHeight: 450, overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow sx={{ '& th': { bgcolor: '#0B1329', color: '#64748B', fontWeight: 800, borderColor: 'rgba(148,163,184,0.08)' } }}>
                <TableCell width="50">#</TableCell>
                <TableCell>Nom</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="center">TD</TableCell>
                <TableCell align="center">Passes</TableCell>
                <TableCell align="center">Yards Course</TableCell>
                <TableCell align="center">Yards Passe</TableCell>
                <TableCell align="center">Blocages Réussis</TableCell>
                <TableCell align="center">KO Infligés</TableCell>
                <TableCell align="center">Sorties Infligées</TableCell>
                <TableCell align="center">Morts Infligés</TableCell>
                <TableCell align="center">Surfs</TableCell>
                <TableCell align="center">Expulsions</TableCell>
                <TableCell align="center">MVP</TableCell>
                <TableCell align="center">XP</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(activeTab === 0 ? homePlayerStats : awayPlayerStats).map((p: any) => (
                <TableRow
                  key={p.playerId}
                  hover
                  sx={{
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.02) !important' },
                    '& td': { borderColor: 'rgba(148,163,184,0.05)', color: '#94A3B8' },
                  }}
                >
                  <TableCell sx={{ fontWeight: 800, color: '#F8FAFC' }}>{p.number}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <span>{p.name || `Joueur #${p.number}`}</span>
                    {getPlayerStat(p, 'deadSustained') > 0 && <span title="Mort">💀</span>}
                    {getPlayerStat(p, 'deadSustained') === 0 && getPlayerStat(p, 'casualtiesSustained') > 0 && <span title="Blessé">🤕</span>}
                  </TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>
                    {p.type ? p.type.replace(/^[a-z]+_/, '').replace(/([A-Z])/g, ' $1') : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.touchdowns > 0 ? 800 : 400, color: p.touchdowns > 0 ? '#00E676' : 'inherit' }}>
                    {p.touchdowns || 0}
                  </TableCell>
                  <TableCell align="center">{p.passes || 0}</TableCell>
                  <TableCell align="center">{p.yardsRunning || 0}</TableCell>
                  <TableCell align="center">{p.yardsPassing || 0}</TableCell>
                  <TableCell align="center">{p.blocksSucceeded || 0}</TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.koInflicted > 0 ? 800 : 400, color: p.koInflicted > 0 ? '#EAB308' : 'inherit' }}>
                    {p.koInflicted || 0}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.casualtiesInflicted > 0 ? 800 : 400, color: p.casualtiesInflicted > 0 ? '#D97706' : 'inherit' }}>
                    {p.casualtiesInflicted || 0}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.deadInflicted > 0 ? 800 : 400, color: p.deadInflicted > 0 ? '#EF4444' : 'inherit' }}>
                    {p.deadInflicted || 0}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.pushouts > 0 ? 800 : 400, color: p.pushouts > 0 ? '#06B6D4' : 'inherit' }}>
                    {p.pushouts || 0}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.sustainedExpulsions > 0 ? 800 : 400, color: p.sustainedExpulsions > 0 ? '#EF4444' : 'inherit' }}>
                    {p.sustainedExpulsions || 0}
                  </TableCell>
                  <TableCell align="center">
                    {p.mvp ? <Chip label="MVP" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 800, height: 18, fontSize: '0.6rem' }} /> : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: p.xpGained > 0 ? 800 : 400, color: p.xpGained > 0 ? '#A855F7' : 'inherit' }}>
                    +{p.xpGained || 0}
                  </TableCell>
                </TableRow>
              ))}
              {(activeTab === 0 ? homePlayerStats : awayPlayerStats).length === 0 && (
                <TableRow>
                  <TableCell colSpan={15} align="center" sx={{ py: 4, color: '#64748B' }}>
                    Aucun joueur enregistré pour cette équipe dans ce match.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default MatchDetail;
