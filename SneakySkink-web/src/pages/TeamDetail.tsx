/**
 * Page de détail d'une équipe (roster, statistiques détaillées et historique des matchs).
 * Utilise les couleurs thématiques de la race de l'équipe pour un rendu néon dynamique.
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Group as TeamIcon,
  Person as CoachIcon,
  SportsSoccer as MatchIcon,
  EmojiEvents as TrophyIcon,
  AttachMoney as MoneyIcon,
  Refresh as RerollIcon,
  QueryStats as StatsIcon,
  History as HistoryIcon,
  Security as ApoIcon,
  Star as PopIcon,
  SupportAgent as StaffIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    
    Promise.all([
      api.getTeam(id),
      api.getTeamStats(id)
    ])
      .then(([teamData, statsData]) => {
        setTeam(teamData);
        setStats(statsData);
      })
      .catch((err) => {
        console.error('Erreur lors du chargement des données de l\'équipe:', err);
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

  if (!team) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Équipe introuvable</Typography>
      </Box>
    );
  }

  const raceInfo = getRaceInfo(team.raceId);
  const raceColor = raceInfo.color;

  // Séparation des joueurs par statut
  const activePlayers = (team.players || []).filter((p: any) => p.status === 'ACTIVE');
  const deadPlayers = (team.players || []).filter((p: any) => p.status === 'DEAD');

  // Formatage de la date de dernière mise à jour
  const formattedUpdateDate = team.updatedAt
    ? new Date(team.updatedAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Inconnue';

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── Hero Section (Bannière d'Équipe) ────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: `1px solid ${alpha(raceColor, 0.2)}`,
          boxShadow: `0 0 15px ${alpha(raceColor, 0.05)}`,
          background: `linear-gradient(135deg, ${alpha(raceColor, 0.05)} 0%, rgba(15,23,42,0.4) 100%)`,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar
                sx={{
                  width: 72,
                  height: 72,
                  bgcolor: alpha(raceColor, 0.1),
                  border: `2px solid ${raceColor}`,
                  color: raceColor,
                  boxShadow: `0 0 10px ${alpha(raceColor, 0.3)}`,
                }}
              >
                <span style={{ fontSize: '2rem' }}>{raceInfo.emoji}</span>
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 950, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5 }}>
                  {team.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={raceInfo.name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      bgcolor: alpha(raceColor, 0.15),
                      color: raceColor,
                      border: `1px solid ${alpha(raceColor, 0.3)}`,
                    }}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: '#64748B',
                      cursor: 'pointer',
                      transition: 'color 0.2s',
                      '&:hover': { color: '#00E676' }
                    }}
                    onClick={() => navigate(`/coach/${team.coachId}`)}
                  >
                    <CoachIcon sx={{ fontSize: 13 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Coach : {team.coach?.name || 'Inconnu'}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: '#475569' }}>
                    MàJ : {formattedUpdateDate}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Valeur d'Équipe (TV)
            </Typography>
            <Typography sx={{ fontWeight: 950, fontSize: '2.5rem', color: raceColor, lineHeight: 1, textShadow: `0 0 10px ${alpha(raceColor, 0.3)}` }}>
              {(team.value / 1000).toFixed(0)}k
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ─── Onglets de Navigation ─────────────────────────────────────────── */}
      <Paper sx={{ mb: 3, bgcolor: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.08)', borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: raceColor,
              boxShadow: `0 0 8px ${raceColor}`,
            },
            '& .MuiTab-root': {
              color: '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              py: 2,
              '&.Mui-selected': {
                color: '#F8FAFC',
              },
            },
          }}
        >
          <Tab icon={<TeamIcon sx={{ fontSize: 18 }} />} label="Roster & Joueurs" iconPosition="start" />
          <Tab icon={<StatsIcon sx={{ fontSize: 18 }} />} label="Performances & Stats" iconPosition="start" />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18 }} />} label={`Matchs (${stats?.summary?.totalMatches || 0})`} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ─── CONTENU DES ONGLETS ───────────────────────────────────────────── */}

      {/* ── Tab 1 : Roster & Joueurs ── */}
      {tabValue === 0 && (
        <Box>
          {/* Fiche Technique (Assets de l'équipe) */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={2.4}>
              <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <RerollIcon sx={{ color: '#3B82F6', fontSize: 18, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Relances</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{team.rerolls}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={2.4}>
              <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <MoneyIcon sx={{ color: '#F59E0B', fontSize: 18, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Trésorerie</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{(team.cash / 1000).toFixed(0)}k</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4} sm={2.4}>
              <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <ApoIcon sx={{ color: '#E11D48', fontSize: 18, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Apothicaire</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{team.apothecary ? 'Oui' : 'Non'}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4} sm={2.4}>
              <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <PopIcon sx={{ color: '#D97706', fontSize: 18, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Popularité</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{team.popularity}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4} sm={2.4}>
              <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <StaffIcon sx={{ color: '#7C3AED', fontSize: 18, mb: 0.5 }} />
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Staff & Cheer</Typography>
                <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>
                  {team.assistantCoaches + team.cheerleaders}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Liste des Joueurs Actifs */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
              🏃 Roster des Joueurs Actifs ({activePlayers.length})
            </Typography>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(148,163,184,0.1)', color: '#64748B', fontWeight: 700 } }}>
                    <TableCell>#</TableCell>
                    <TableCell>Nom / Positional</TableCell>
                    <TableCell align="center">M</TableCell>
                    <TableCell align="center">F</TableCell>
                    <TableCell align="center">AG</TableCell>
                    <TableCell align="center">PA</TableCell>
                    <TableCell align="center">AR</TableCell>
                    <TableCell>Compétences</TableCell>
                    <TableCell align="right">Valeur</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activePlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748B' }}>
                        Aucun joueur actif dans le roster.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activePlayers.map((player: any) => (
                      <TableRow
                        key={player.id}
                        sx={{
                          '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' },
                          transition: 'all 0.2s',
                          '&:hover': {
                            bgcolor: alpha(raceColor, 0.02),
                            '& td': { color: '#F8FAFC' }
                          }
                        }}
                      >
                        <TableCell sx={{ color: raceColor, fontWeight: 800 }}>{player.number}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {player.name || 'Sans Nom'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            {player.type} · Niv. {player.level} ({player.xp} XP)
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{player.ma}</TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{player.st}</TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{player.ag}+</TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{player.pa || '-'}+</TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{player.av}+</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(player.innateSkills || []).slice(0, 4).map((skill: string) => (
                              <Chip key={skill} label={skill} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)', color: '#94A3B8' }} />
                            ))}
                            {(player.acquiredSkills || []).map((skill: string) => (
                              <Chip key={skill} label={skill} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(raceColor, 0.1), color: raceColor, border: `1px solid ${alpha(raceColor, 0.2)}` }} />
                            ))}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                          {(player.value / 1000).toFixed(0)}k
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Mémorial des Joueurs Décédés */}
          {deadPlayers.length > 0 && (
            <Paper sx={{ p: 3, border: '1px solid rgba(239,68,68,0.2)', borderRadius: 3, bgcolor: 'rgba(239,68,68,0.02)', boxShadow: '0 0 10px rgba(239,68,68,0.02)' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#EF4444', mb: 2 }}>
                💀 Mémorial des Joueurs Décédés ({deadPlayers.length})
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {deadPlayers.map((player: any) => (
                  <Chip
                    key={player.id}
                    avatar={<Avatar sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#EF4444', fontSize: '0.75rem', fontWeight: 800 }}>{player.number}</Avatar>}
                    label={`${player.name || 'Sans Nom'} (${player.type})`}
                    variant="outlined"
                    sx={{
                      borderColor: 'rgba(239,68,68,0.2)',
                      color: '#EF4444',
                      fontWeight: 600,
                      bgcolor: 'rgba(239,68,68,0.02)',
                      '&:hover': {
                        bgcolor: 'rgba(239,68,68,0.06)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Paper>
          )}
        </Box>
      )}

      {/* ── Tab 2 : Performances & Stats ── */}
      {tabValue === 1 && (
        <Box>
          {/* Résumé du Bilan Global de l'Équipe */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.08)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Victoires</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#00E676' }}>{stats?.summary?.wins || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.08)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Nuls</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#94A3B8' }}>{stats?.summary?.draws || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.08)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Défaites</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#EF4444' }}>{stats?.summary?.losses || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid rgba(148,163,184,0.08)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Taux de Victoire</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: raceColor, textShadow: `0 0 10px ${alpha(raceColor, 0.2)}` }}>
                  {stats?.summary?.winrate || 0}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Grille détaillée des statistiques de match */}
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
              📈 Statistiques de Jeu Consolidées
            </Typography>

            <Grid container spacing={2}>
              {[
                { label: 'Touchdowns Marqués', value: stats?.performance?.touchdowns, color: '#00E676' },
                { label: 'Passes Réussies', value: stats?.performance?.passes, color: '#3B82F6' },
                { label: 'Réceptions Réussies', value: stats?.performance?.catches, color: '#60A5FA' },
                { label: 'Interceptions', value: stats?.performance?.interceptions, color: '#A855F7' },
                { label: 'Yards à la Course', value: stats?.performance?.yardsRunning, color: '#10B981' },
                { label: 'Yards à la Passe', value: stats?.performance?.yardsPassing, color: '#2563EB' },
                { label: 'Blocages Réussis', value: stats?.performance?.blocksSucceeded, color: '#F59E0B' },
                { label: 'Blocages Subis', value: stats?.performance?.blocksSustained, color: '#EF4444' },
                { label: 'Armures Brisées', value: stats?.performance?.armourBreaks, color: '#D97706' },
                { label: 'Placages', value: stats?.performance?.tackles, color: '#6366F1' },
                { label: 'Sorties Infligées', value: stats?.performance?.casualtiesInflicted, color: '#EF4444' },
                { label: 'K.O. Infligés', value: stats?.performance?.koInflicted, color: '#F43F5E' },
                { label: 'Blessures Infligées', value: stats?.performance?.injuriesInflicted, color: '#B91C1C' },
                { label: 'Morts Infligés', value: stats?.performance?.deadInflicted, color: '#7F1D1D' },
              ].map((stat, idx) => (
                <Grid item xs={6} sm={4} md={3} key={idx}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid rgba(148,163,184,0.04)',
                      bgcolor: 'rgba(30,41,59,0.1)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: stat.color }}>
                      {stat.value || 0}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Box>
      )}

      {/* ── Tab 3 : Historique des Matchs ── */}
      {tabValue === 2 && (
        <Box>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
              ⚽ Journal des Matchs
            </Typography>

            {!stats?.matches || stats.matches.length === 0 ? (
              <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucun match joué par cette équipe pour le moment.</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {stats.matches.map((m: any) => {
                  const isHome = m.homeTeamId === id;
                  const myScore = isHome ? m.homeScore : m.awayScore;
                  const oppScore = isHome ? m.awayScore : m.homeScore;
                  
                  let outcomeLabel = 'NUL';
                  let outcomeColor = '#94A3B8';
                  let cardBorderColor = 'rgba(148,163,184,0.08)';
                  let cardGlow = 'none';

                  if (myScore > oppScore) {
                    outcomeLabel = 'VICTOIRE';
                    outcomeColor = '#00E676';
                    cardBorderColor = alpha('#00E676', 0.25);
                    cardGlow = `0 0 10px ${alpha('#00E676', 0.05)}`;
                  } else if (myScore < oppScore) {
                    outcomeLabel = 'DÉFAITE';
                    outcomeColor = '#EF4444';
                    cardBorderColor = alpha('#EF4444', 0.2);
                  }

                  const oppTeam = isHome ? m.awayTeam : m.homeTeam;
                  const oppCoachName = isHome ? (m.awayCoach?.name || 'Inconnu') : (m.homeCoach?.name || 'Inconnu');

                  return (
                    <Paper
                      key={m.id}
                      onClick={() => navigate(`/match/${m.id}`)}
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        border: `1px solid ${cardBorderColor}`,
                        boxShadow: cardGlow,
                        background: 'linear-gradient(135deg, rgba(30,41,59,0.2) 0%, rgba(15,23,42,0.2) 100%)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: raceColor,
                          boxShadow: `0 0 12px ${alpha(raceColor, 0.1)}`,
                          transform: 'translateY(-1px)',
                        }
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        {/* Infos Match */}
                        <Grid item xs={12} sm={3}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ color: raceColor, fontWeight: 800 }}>
                              {m.competition?.name || 'Compétition Inconnue'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {new Date(m.startedAt).toLocaleDateString('fr-FR')}
                            </Typography>
                            <Chip
                              label={outcomeLabel}
                              size="small"
                              sx={{
                                alignSelf: 'flex-start',
                                height: 18,
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                bgcolor: alpha(outcomeColor, 0.1),
                                color: outcomeColor,
                                border: `1px solid ${alpha(outcomeColor, 0.2)}`,
                              }}
                            />
                          </Box>
                        </Grid>

                        {/* Rendu des Équipes & Scores */}
                        <Grid item xs={12} sm={9}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Équipe Domicile */}
                            <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                              <Typography
                                sx={{
                                  fontWeight: isHome ? 800 : 600,
                                  color: isHome ? '#F8FAFC' : '#94A3B8',
                                  fontSize: '0.875rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {m.homeTeam?.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.homeCoach?.name || 'Inconnu'}
                              </Typography>
                            </Box>

                            {/* Score central */}
                            <Box
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1.5,
                                bgcolor: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                minWidth: 60,
                                textAlign: 'center'
                              }}
                            >
                              <Typography sx={{ fontWeight: 900, color: outcomeColor, fontSize: '1.05rem', letterSpacing: '0.05em' }}>
                                {m.homeScore} - {m.awayScore}
                              </Typography>
                            </Box>

                            {/* Équipe Extérieur */}
                            <Box sx={{ flex: 1, minWidth: 0, pl: 1, textAlign: 'right' }}>
                              <Typography
                                sx={{
                                  fontWeight: !isHome ? 800 : 600,
                                  color: !isHome ? '#F8FAFC' : '#94A3B8',
                                  fontSize: '0.875rem',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {m.awayTeam?.name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m.awayCoach?.name || 'Inconnu'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>
      )}

    </Box>
  );
};

export default TeamDetail;
