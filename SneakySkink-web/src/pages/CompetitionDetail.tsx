/**
 * Page de détail d'une compétition.
 * Gère l'affichage des matchs par journée, le classement dynamique toutes rondes / suisse
 * avec sélection de tie-breaker, et l'arbre de tournoi (Bracket) pour le format Knockout.
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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  SportsSoccer as CompetitionIcon,
  EmojiEvents as LeagueIcon,
  ArrowForward as ArrowIcon,
  FormatListNumbered as StandingsIcon,
  AccountTree as BracketIcon,
  History as MatchesIcon,
} from '@mui/icons-material';
import { api } from '../api';

const CompetitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('ALL');
  const [tieBreaker, setTieBreaker] = useState<string>('pts-wins-diff-td');
  const [activeTab, setActiveTab] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getCompetition(id)
      .then((res: any) => {
        const item = res.data || res;
        setCompetition(item);
        // Initialiser l'onglet par défaut selon le format
        if (item.format === 'Knockout') {
          setActiveTab('bracket');
        } else {
          setActiveTab('standings');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Récupérer toutes les journées (rounds) uniques
  const rounds = useMemo(() => {
    if (!competition?.matches) return [];
    return Array.from(new Set(competition.matches.map((m: any) => m.round)))
      .sort((a: any, b: any) => b - a);
  }, [competition]);

  // Filtrer les matchs par journée
  const filteredMatches = useMemo(() => {
    if (!competition?.matches) return [];
    if (selectedRound === 'ALL') return competition.matches;
    return competition.matches.filter((m: any) => m.round === Number(selectedRound));
  }, [competition, selectedRound]);

  // Calculer le classement dynamique (standings)
  const standings = useMemo(() => {
    if (!competition || !competition.matches) return [];
    
    const teamsMap = new Map<string, {
      teamId: string;
      teamName: string;
      coachId: string;
      coachName: string;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      tdPlus: number;
      tdMinus: number;
      tdDiff: number;
      points: number;
    }>();

    const getOrCreate = (teamId: string, teamName: string, coachId: string, coachName: string) => {
      if (!teamsMap.has(teamId)) {
        teamsMap.set(teamId, {
          teamId,
          teamName: teamName || 'Équipe inconnue',
          coachId,
          coachName: coachName || 'Inconnu',
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          tdPlus: 0,
          tdMinus: 0,
          tdDiff: 0,
          points: 0,
        });
      }
      return teamsMap.get(teamId)!;
    };

    // Pré-remplir avec toutes les équipes uniques apparaissant dans les matchs
    competition.matches.forEach((m: any) => {
      if (m.homeTeamId && m.homeTeam) {
        getOrCreate(m.homeTeamId, m.homeTeam.name, m.homeCoachId, m.homeCoach?.name);
      }
      if (m.awayTeamId && m.awayTeam) {
        getOrCreate(m.awayTeamId, m.awayTeam.name, m.awayCoachId, m.awayCoach?.name);
      }
    });

    // Accumuler les résultats des matchs joués/validés
    competition.matches.forEach((m: any) => {
      const isPlayed = m.status === 'PLAYED' || m.status === 'VALIDATED';
      if (!isPlayed || !m.homeTeamId || !m.awayTeamId) return;

      const home = getOrCreate(m.homeTeamId, m.homeTeam?.name, m.homeCoachId, m.homeCoach?.name);
      const away = getOrCreate(m.awayTeamId, m.awayTeam?.name, m.awayCoachId, m.awayCoach?.name);

      home.played += 1;
      away.played += 1;

      home.tdPlus += m.homeScore;
      home.tdMinus += m.awayScore;
      away.tdPlus += m.awayScore;
      away.tdMinus += m.homeScore;

      if (m.homeScore > m.awayScore) {
        home.wins += 1;
        home.points += 3;
        away.losses += 1;
      } else if (m.homeScore < m.awayScore) {
        away.wins += 1;
        away.points += 3;
        home.losses += 1;
      } else {
        home.draws += 1;
        home.points += 1;
        away.draws += 1;
        away.points += 1;
      }
    });

    // Mettre à jour les différences de TD
    const list = Array.from(teamsMap.values()).map((t) => {
      t.tdDiff = t.tdPlus - t.tdMinus;
      return t;
    });

    // Trier selon le tie-breaker choisi
    return list.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }

      if (tieBreaker === 'pts-wins-diff-td') {
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
        if (a.tdPlus !== b.tdPlus) return b.tdPlus - a.tdPlus;
      } else if (tieBreaker === 'pts-diff-td-wins') {
        if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
        if (a.tdPlus !== b.tdPlus) return b.tdPlus - a.tdPlus;
        if (a.wins !== b.wins) return b.wins - a.wins;
      } else if (tieBreaker === 'pts-diff-wins-td') {
        if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
        if (a.wins !== b.wins) return b.wins - a.wins;
        if (a.tdPlus !== b.tdPlus) return b.tdPlus - a.tdPlus;
      }

      // Par défaut, tri alphabétique du nom de l'équipe
      return a.teamName.localeCompare(b.teamName);
    });
  }, [competition, tieBreaker]);

  // Regrouper les matchs par round pour le Bracket Knockout
  const bracketRounds = useMemo(() => {
    if (!competition?.matches || competition.format !== 'Knockout') return [];
    
    const roundsMap: Record<number, any[]> = {};
    competition.matches.forEach((m: any) => {
      if (!roundsMap[m.round]) {
        roundsMap[m.round] = [];
      }
      roundsMap[m.round].push(m);
    });

    const sortedRounds = Object.keys(roundsMap)
      .map(Number)
      .sort((a, b) => a - b);

    const maxRound = sortedRounds.length > 0 ? sortedRounds[sortedRounds.length - 1] : 1;

    return sortedRounds.map((rNum) => {
      let name = `Tour ${rNum}`;
      if (rNum === maxRound) name = 'Finale';
      else if (rNum === maxRound - 1) name = 'Demi-finales';
      else if (rNum === maxRound - 2) name = 'Quarts de finale';
      else if (rNum === maxRound - 3) name = 'Huitièmes';
      
      return {
        roundNumber: rNum,
        name,
        matches: roundsMap[rNum],
      };
    });
  }, [competition]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }

  if (!competition) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Compétition introuvable</Typography>
      </Box>
    );
  }

  const isKnockout = competition.format === 'Knockout';

  // Libellé de format en français
  const formatLabels: Record<string, string> = {
    Knockout: 'Élimination Directe',
    RoundRobin: 'Championnat Toutes Rondes',
    Wissen: 'Ronde Suisse',
    Ladder: 'Échelle',
  };

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
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 2.5,
              bgcolor: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.15)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CompetitionIcon sx={{ fontSize: 32 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5 }}>
              {competition.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip
                label={competition.status === 'InProgress' ? 'En cours' : competition.status === 'Scheduled' ? 'Planifiée' : 'Terminée'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: competition.status === 'InProgress' ? 'rgba(59,130,246,0.08)' : 'rgba(148,163,184,0.08)',
                  color: competition.status === 'InProgress' ? '#3B82F6' : '#94A3B8',
                  border: `1px solid ${competition.status === 'InProgress' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.15)'}`,
                }}
              />
              <Chip
                label={formatLabels[competition.format] || competition.format}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  bgcolor: 'rgba(168,85,247,0.08)',
                  color: '#A855F7',
                  border: '1px solid rgba(168,85,247,0.15)',
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B', cursor: 'pointer', '&:hover': { color: '#F59E0B' } }} onClick={() => navigate(`/ligue/${competition.leagueId}`)}>
                <LeagueIcon sx={{ fontSize: 13 }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  Ligue: {competition.leagueName}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ─── Onglets de Navigation ─── */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148,163,184,0.08)', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            '& .MuiTabs-indicator': { bgcolor: '#00E676' },
            '& .MuiTab-root': { color: '#64748B', fontWeight: 700, textTransform: 'none' },
            '& .MuiTab-root.Mui-selected': { color: '#00E676' },
          }}
        >
          {!isKnockout && (
            <Tab
              value="standings"
              label="Classement"
              icon={<StandingsIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
          )}
          {isKnockout && (
            <Tab
              value="bracket"
              label="Arbre du Tournoi"
              icon={<BracketIcon sx={{ fontSize: 16 }} />}
              iconPosition="start"
            />
          )}
          <Tab
            value="matches"
            label="Liste des Matchs"
            icon={<MatchesIcon sx={{ fontSize: 16 }} />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* ─── CONTENU DE L'ONGLET CLASSEMENT ─── */}
      {activeTab === 'standings' && !isKnockout && (
        <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
              📊 Classement général
            </Typography>

            <FormControl size="small" sx={{ minWidth: 260 }}>
              <InputLabel id="tie-breaker-label" sx={{ color: '#64748B', fontSize: '0.8rem', fontWeight: 600 }}>Départage (Tie-Breaker)</InputLabel>
              <Select
                labelId="tie-breaker-label"
                value={tieBreaker}
                label="Départage (Tie-Breaker)"
                onChange={(e) => setTieBreaker(e.target.value)}
                sx={{
                  height: 36,
                  bgcolor: 'rgba(30,41,59,0.3)',
                  border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 2,
                  color: '#F8FAFC',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                <MenuItem value="pts-wins-diff-td">Points &gt; Victoires &gt; Diff. TD</MenuItem>
                <MenuItem value="pts-diff-td-wins">Points &gt; Diff. TD &gt; TD marqués</MenuItem>
                <MenuItem value="pts-diff-wins-td">Points &gt; Diff. TD &gt; Victoires</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {standings.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucune donnée disponible pour le classement.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(148,163,184,0.1)', color: '#64748B', fontWeight: 700 } }}>
                    <TableCell align="center" sx={{ width: 50 }}>Pos</TableCell>
                    <TableCell>Équipe</TableCell>
                    <TableCell>Coach</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#00E676' }}>PTS</TableCell>
                    <TableCell align="center">J</TableCell>
                    <TableCell align="center">V</TableCell>
                    <TableCell align="center">N</TableCell>
                    <TableCell align="center">D</TableCell>
                    <TableCell align="center">TD+</TableCell>
                    <TableCell align="center">TD-</TableCell>
                    <TableCell align="center">Diff</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {standings.map((row, idx) => (
                    <TableRow
                      key={row.teamId}
                      sx={{
                        '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' }
                      }}
                    >
                      <TableCell align="center" sx={{ fontWeight: 800, color: idx < 3 ? '#00E676' : '#64748B' }}>
                        {idx + 1}
                      </TableCell>
                      <TableCell
                        onClick={() => navigate(`/equipe/${row.teamId}`)}
                        sx={{ fontWeight: 800, color: '#F8FAFC', cursor: 'pointer', '&:hover': { color: '#00E676' } }}
                      >
                        {row.teamName}
                      </TableCell>
                      <TableCell
                        onClick={() => row.coachId && navigate(`/coach/${row.coachId}`)}
                        sx={{ color: '#94A3B8', cursor: row.coachId ? 'pointer' : 'default', '&:hover': { color: row.coachId ? '#00E676' : '#94A3B8' } }}
                      >
                        {row.coachName}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 900, color: '#00E676', fontSize: '1rem' }}>
                        {row.points}
                      </TableCell>
                      <TableCell align="center" sx={{ color: '#F8FAFC' }}>{row.played}</TableCell>
                      <TableCell align="center" sx={{ color: '#00E676', fontWeight: 700 }}>{row.wins}</TableCell>
                      <TableCell align="center" sx={{ color: '#94A3B8' }}>{row.draws}</TableCell>
                      <TableCell align="center" sx={{ color: '#FF3D00' }}>{row.losses}</TableCell>
                      <TableCell align="center" sx={{ color: '#64748B' }}>{row.tdPlus}</TableCell>
                      <TableCell align="center" sx={{ color: '#64748B' }}>{row.tdMinus}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: row.tdDiff > 0 ? '#00E676' : row.tdDiff < 0 ? '#FF3D00' : '#F8FAFC' }}>
                        {row.tdDiff > 0 ? `+${row.tdDiff}` : row.tdDiff}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ─── CONTENU DE L'ONGLET BRACKET ─── */}
      {activeTab === 'bracket' && isKnockout && (
        <Box sx={{ mb: 4, width: '100%' }}>
          {bracketRounds.length === 0 ? (
            <Paper sx={{ p: 4, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucun match disponible pour générer l'arbre.</Typography>
            </Paper>
          ) : (
            <Box
              sx={{
                display: 'flex',
                gap: 4,
                overflowX: 'auto',
                pb: 2,
                pt: 1,
                alignItems: 'stretch',
                width: '100%',
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 4 },
              }}
            >
              {bracketRounds.map((round) => (
                <Box
                  key={round.roundNumber}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 260,
                    flexShrink: 0,
                  }}
                >
                  {/* Titre du round */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00E676', textAlign: 'center', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {round.name}
                  </Typography>

                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.08)', mb: 3 }} />

                  {/* Arbre de matchs flexible */}
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-around',
                      flexGrow: 1,
                      gap: 3,
                    }}
                  >
                    {round.matches.map((m: any) => {
                      const isPlayed = m.status === 'PLAYED' || m.status === 'VALIDATED';
                      const homeWon = isPlayed && m.homeScore > m.awayScore;
                      const awayWon = isPlayed && m.awayScore > m.homeScore;

                      return (
                        <Paper
                          key={m.id}
                          onClick={() => navigate(`/match/${m.id}`)}
                          sx={{
                            p: 1.5,
                            borderRadius: 2.5,
                            border: '1px solid rgba(148,163,184,0.08)',
                            bgcolor: 'rgba(15,23,42,0.6)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            position: 'relative',
                            '&:hover': {
                              borderColor: '#3B82F6',
                              boxShadow: '0 0 12px rgba(59,130,246,0.15)',
                              transform: 'translateY(-2px)',
                            }
                          }}
                        >
                          {/* Round ID badge en miniature */}
                          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem', position: 'absolute', top: 4, right: 8 }}>
                            Match {m.id.substring(0, 4)}
                          </Typography>

                          {/* Équipe Domicile */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                            <Box sx={{ minWidth: 0, pr: 1 }}>
                              <Typography sx={{ fontWeight: 800, color: homeWon ? '#00E676' : isPlayed ? '#475569' : '#F8FAFC', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.homeTeam?.name || 'En attente'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>
                                {m.homeCoach?.name || ''}
                              </Typography>
                            </Box>
                            {isPlayed && (
                              <Typography sx={{ fontWeight: 900, color: homeWon ? '#00E676' : '#475569', fontSize: '1rem', pl: 1 }}>
                                {m.homeScore}
                              </Typography>
                            )}
                          </Box>

                          <Divider sx={{ borderColor: 'rgba(148,163,184,0.04)', my: 0.5 }} />

                          {/* Équipe Extérieur */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                            <Box sx={{ minWidth: 0, pr: 1 }}>
                              <Typography sx={{ fontWeight: 800, color: awayWon ? '#00E676' : isPlayed ? '#475569' : '#F8FAFC', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.awayTeam?.name || 'En attente'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontSize: '0.7rem' }}>
                                {m.awayCoach?.name || ''}
                              </Typography>
                            </Box>
                            {isPlayed && (
                              <Typography sx={{ fontWeight: 900, color: awayWon ? '#00E676' : '#475569', fontSize: '1rem', pl: 1 }}>
                                {m.awayScore}
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {/* ─── CONTENU DE L'ONGLET MATCHS (LISTE COMPLETE) ─── */}
      {activeTab === 'matches' && (
        <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
              ⚽ Matchs de la compétition
            </Typography>

            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                sx={{
                  height: 36,
                  bgcolor: 'rgba(30,41,59,0.3)',
                  border: '1px solid rgba(148,163,184,0.1)',
                  borderRadius: 2,
                  color: '#F8FAFC',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                <MenuItem value="ALL">Toutes les journées</MenuItem>
                {rounds.map((r: any) => (
                  <MenuItem key={r} value={r.toString()}>Journée {r}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {filteredMatches.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucun match disponible pour cette sélection.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredMatches.map((match: any) => {
                const isPlayed = match.status === 'PLAYED' || match.status === 'VALIDATED';
                return (
                  <Paper
                    key={match.id}
                    onClick={() => navigate(`/match/${match.id}`)}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid rgba(148,163,184,0.06)',
                      background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      '&:hover': {
                        border: '1px solid rgba(0,230,118,0.2)',
                        bgcolor: 'rgba(0,230,118,0.02)',
                        transform: 'scale(1.005)',
                      }
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      
                      {/* Round / Date */}
                      <Grid item xs={12} sm={2} sx={{ borderRight: { sm: '1px solid rgba(148,163,184,0.06)' }, pr: 1 }}>
                        <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Journée {match.round}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem' }}>
                          {new Date(match.startedAt).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Grid>

                      {/* Match representation */}
                      <Grid item xs={12} sm={9}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          
                          {/* Home Team */}
                          <Box sx={{ flex: 1, textAlign: 'right', pr: 2, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {match.homeTeam?.name || 'En attente'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {match.homeCoach?.name || 'Coach Inconnu'}
                            </Typography>
                          </Box>

                          {/* Scores / VS */}
                          <Box sx={{ px: 2, py: 0.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 70, textAlign: 'center' }}>
                            {isPlayed ? (
                              <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '1.2rem', letterSpacing: '0.1em' }}>
                                {match.homeScore} - {match.awayScore}
                              </Typography>
                            ) : (
                              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800 }}>
                                VS
                              </Typography>
                            )}
                          </Box>

                          {/* Away Team */}
                          <Box sx={{ flex: 1, textAlign: 'left', pl: 2, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {match.awayTeam?.name || 'En attente'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {match.awayCoach?.name || 'Coach Inconnu'}
                            </Typography>
                          </Box>

                        </Box>
                      </Grid>

                      {/* Action */}
                      <Grid item xs={12} sm={1} sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                        <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                      </Grid>

                    </Grid>
                  </Paper>
                );
              })}
            </Box>
          )}
        </Paper>
      )}

    </Box>
  );
};

export default CompetitionDetail;
