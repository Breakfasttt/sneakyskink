/**
 * Page de détail d'un coach (Fiche profil)
 * Affiche les statistiques globales, les derniers matchs, les équipes possédées,
 * les graphiques de performance Recharts et le face-à-face avec les autres coachs.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Button,
  Avatar,
  Divider,
  Chip,
  InputBase,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  alpha,
  Pagination,
} from '@mui/material';
import {
  Person as CoachIcon,
  SportsSoccer as MatchIcon,
  EmojiEvents as TrophyIcon,
  ArrowForward as ArrowIcon,
  Search as SearchIcon,
  Public as PublicIcon,
  TrendingUp as WinrateIcon,
  Schedule as ClockIcon,
} from '@mui/icons-material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

const CoachDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [coachData, setCoachData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [oppSearch, setOppSearch] = useState('');
  const [oppPage, setOppPage] = useState(1);
  const oppLimit = 5;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([api.getCoach(id), api.getCoachStats(id)])
      .then(([coachRes, statsRes]) => {
        setCoachData(coachRes);
        setStats(statsRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // ─── Calculs Statistiques Frontend ────────────────────────────────────────

  // Calcul du winrate sur les 30 derniers matchs
  const last30Winrate = useMemo(() => {
    if (!stats?.matches || stats.matches.length === 0) return 0;
    const recentMatches = stats.matches.slice(0, 30);
    let wins = 0;
    recentMatches.forEach((m: any) => {
      const isHome = m.homeCoachId === id;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      if (myScore > oppScore) wins++;
    });
    return Number(((wins / recentMatches.length) * 100).toFixed(1));
  }, [stats?.matches, id]);

  // Extraction unique des ligues et compétitions liées
  const linkedLeaguesAndCompetitions = useMemo(() => {
    if (!stats?.matches) return { leagues: [], competitions: [] };
    const leaguesMap = new Map<string, string>();
    const compsMap = new Map<string, { id: string; name: string }>();

    stats.matches.forEach((m: any) => {
      if (m.league) leaguesMap.set(m.league.id, m.league.name);
      if (m.competition) compsMap.set(m.competition.id, { id: m.competition.id, name: m.competition.name });
    });

    return {
      leagues: Array.from(leaguesMap.entries()).map(([leagueId, name]) => ({ id: leagueId, name })),
      competitions: Array.from(compsMap.values()),
    };
  }, [stats?.matches]);

  // Évolution chronologique du winrate cumulé
  const winrateEvolutionData = useMemo(() => {
    if (!stats?.matches || stats.matches.length === 0) return [];
    const chronological = [...stats.matches].reverse();
    let currentWins = 0;
    return chronological.map((m: any, index: number) => {
      const isHome = m.homeCoachId === id;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      if (myScore > oppScore) currentWins++;
      return {
        matchIndex: `M${index + 1}`,
        Winrate: Number(((currentWins / (index + 1)) * 100).toFixed(1)),
      };
    });
  }, [stats?.matches, id]);

  // Activité horaire des matchs (formatée pour Recharts)
  const hourlyActivityData = useMemo(() => {
    const activity = stats?.activity?.hourlyActivity || Array(24).fill(0);
    return activity.map((count: number, hour: number) => ({
      hour: `${hour}h`,
      Matchs: count,
    }));
  }, [stats?.activity?.hourlyActivity]);

  // Face-à-face cumulés avec les autres coachs
  const faceToFaceList = useMemo(() => {
    if (!stats?.matches) return [];
    const opponents: Record<string, { id: string; name: string; wins: number; draws: number; losses: number; total: number }> = {};

    stats.matches.forEach((m: any) => {
      const isHome = m.homeCoachId === id;
      const myScore = isHome ? m.homeScore : m.awayScore;
      const oppScore = isHome ? m.awayScore : m.homeScore;
      const oppCoach = isHome ? m.awayCoach : m.homeCoach;

      if (oppCoach && oppCoach.name && oppCoach.id !== id) {
        if (!opponents[oppCoach.name]) {
          opponents[oppCoach.name] = { id: oppCoach.id, name: oppCoach.name, wins: 0, draws: 0, losses: 0, total: 0 };
        }
        const record = opponents[oppCoach.name];
        record.total++;
        if (myScore > oppScore) record.wins++;
        else if (myScore === oppScore) record.draws++;
        else record.losses++;
      }
    });

    return Object.values(opponents).sort((a, b) => a.name.localeCompare(b.name));
  }, [stats?.matches, id]);

  // Matchups positifs / négatifs
  const { positiveMatchups, negativeMatchups } = useMemo(() => {
    const records = faceToFaceList.map((opp) => {
      const winrate = (opp.wins / opp.total) * 100;
      return { ...opp, winrate: Number(winrate.toFixed(1)) };
    });

    // Matchups positifs (winrate le plus haut, minimum 1 match)
    const positive = [...records]
      .filter((r) => r.total >= 1)
      .sort((a, b) => b.winrate - a.winrate || b.total - a.total)
      .slice(0, 3);

    // Matchups négatifs (winrate le plus bas)
    const negative = [...records]
      .filter((r) => r.total >= 1)
      .sort((a, b) => a.winrate - b.winrate || b.total - a.total)
      .slice(0, 3);

    return { positiveMatchups: positive, negativeMatchups: negative };
  }, [faceToFaceList]);

  // Filtrage du face-à-face pour la recherche
  const filteredOpponents = useMemo(() => {
    return faceToFaceList.filter((opp) =>
      opp.name.toLowerCase().includes(oppSearch.toLowerCase())
    );
  }, [faceToFaceList, oppSearch]);

  // Pagination du face-à-face
  const paginatedOpponents = useMemo(() => {
    const offset = (oppPage - 1) * oppLimit;
    return filteredOpponents.slice(offset, offset + oppLimit);
  }, [filteredOpponents, oppPage]);

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
  const recentMatchesList = stats?.matches?.slice(0, 5) || [];

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
      </Paper>

      {/* ─── Stats Grid ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Winrate */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center', height: '100%' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Taux de Victoire
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#00E676', lineHeight: 1 }}>
              {summary.winrate}%
            </Typography>
          </Paper>
        </Grid>

        {/* Winrate sur les 30 derniers matchs */}
        <Grid item xs={6} sm={3}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center', height: '100%' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Winrate (30 derniers)
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#3B82F6', lineHeight: 1 }}>
              {last30Winrate}%
            </Typography>
          </Paper>
        </Grid>

        {/* Total Matches */}
        <Grid item xs={6} sm={2}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center', height: '100%' }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
              Matchs Joués
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#F8FAFC', lineHeight: 1 }}>
              {summary.totalMatches}
            </Typography>
          </Paper>
        </Grid>

        {/* Ratio bar */}
        <Grid item xs={6} sm={4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 700 }}>{summary.wins} V</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>{summary.draws} N</Typography>
              <Typography variant="caption" sx={{ color: '#FF3D00', fontWeight: 700 }}>{summary.losses} D</Typography>
            </Box>
            <Box sx={{ height: 8, display: 'flex', borderRadius: 99, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.05)' }}>
              <Box sx={{ flex: summary.wins || 1, bgcolor: '#00E676' }} />
              <Box sx={{ flex: summary.draws || 1, bgcolor: '#94A3B8' }} />
              <Box sx={{ flex: summary.losses || 1, bgcolor: '#FF3D00' }} />
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Navigation Ligues et Compétitions ─── */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 4 }}>
        {linkedLeaguesAndCompetitions.leagues.map((l) => (
          <Chip
            key={l.id}
            label={l.name}
            icon={<TrophyIcon style={{ fontSize: 13 }} />}
            onClick={() => navigate(`/ligue/${l.id}`)}
            size="small"
            sx={{ bgcolor: 'rgba(245,158,11,0.06)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)', fontWeight: 700, cursor: 'pointer' }}
          />
        ))}
        {linkedLeaguesAndCompetitions.competitions.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            icon={<MatchIcon style={{ fontSize: 13 }} />}
            onClick={() => navigate(`/competition/${c.id}`)}
            size="small"
            sx={{ bgcolor: 'rgba(59,130,246,0.06)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.2)', fontWeight: 700, cursor: 'pointer' }}
          />
        ))}
      </Box>

      {/* ─── Main Details Grid ─── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
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
                {coachData.teams.map((team: any) => {
                  const raceInfo = getRaceInfo(team.raceId);
                  return (
                    <Paper
                      key={team.id}
                      onClick={() => navigate(`/equipe/${team.id}`)}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: `1px solid ${alpha(raceInfo.color, 0.15)}`,
                        background: `linear-gradient(135deg, ${alpha(raceInfo.color, 0.05)} 0%, rgba(15,23,42,0.3) 100%)`,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        '&:hover': {
                          border: `1px solid ${raceInfo.color}`,
                          boxShadow: `0 4px 12px ${alpha(raceInfo.color, 0.1)}`,
                          transform: 'translateX(4px)',
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ bgcolor: alpha(raceInfo.color, 0.1), color: raceInfo.color, width: 36, height: 36, border: `1px solid ${alpha(raceInfo.color, 0.2)}` }}>
                          {raceInfo.emoji}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#F8FAFC' }}>{team.name}</Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            TV {(team.value / 1000).toFixed(0)}k · {team.wins}V/{team.draws}N/{team.losses}D · {raceInfo.name}
                          </Typography>
                        </Box>
                      </Box>
                      <ArrowIcon sx={{ fontSize: 14, color: '#334155' }} />
                    </Paper>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Coach Performance */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', height: '100%' }}>
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

      {/* ─── Matchups Positifs et Négatifs ─── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(0,230,118,0.15)', borderRadius: 3, bgcolor: 'rgba(0,230,118,0.02)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00E676', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              🔥 Matchups Favoris
            </Typography>
            {positiveMatchups.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748B' }}>Aucun matchup enregistré.</Typography>
            ) : (
              positiveMatchups.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{m.name}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#00E676' }}>
                    {m.winrate}% win ({m.wins}V - {m.draws}N - {m.losses}D)
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Paper sx={{ p: 3, border: '1px solid rgba(255,61,0,0.15)', borderRadius: 3, bgcolor: 'rgba(255,61,0,0.02)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FF3D00', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              ⚠️ Matchups Difficiles
            </Typography>
            {negativeMatchups.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#64748B' }}>Aucun matchup enregistré.</Typography>
            ) : (
              negativeMatchups.map((m) => (
                <Box key={m.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>{m.name}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#FF3D00' }}>
                    {m.winrate}% win ({m.wins}V - {m.draws}N - {m.losses}D)
                  </Typography>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Graphiques Recharts ─── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Évolution Winrate */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <WinrateIcon sx={{ color: '#3B82F6' }} /> Évolution Cumulative du Winrate (%)
            </Typography>
            {winrateEvolutionData.length === 0 ? (
              <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B' }}>
                Pas assez de matchs pour afficher la courbe.
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={winrateEvolutionData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                    <XAxis dataKey="matchIndex" stroke="#475569" fontSize={10} />
                    <YAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                    <ChartTooltip
                      contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 8 }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 700 }}
                      itemStyle={{ color: '#00E676' }}
                    />
                    <Line type="monotone" dataKey="Winrate" stroke="#00E676" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Répartition Horaire */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ClockIcon sx={{ color: '#A855F7' }} /> Répartition Horaire des Matchs
            </Typography>
            <Box sx={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyActivityData} margin={{ left: -20, right: 10, top: 10, bottom: 5 }}>
                  <XAxis dataKey="hour" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={10} allowDecimals={false} />
                  <ChartTooltip
                    contentStyle={{ backgroundColor: '#0F172A', border: '1px solid rgba(148,163,184,0.12)', borderRadius: 8 }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 700 }}
                    itemStyle={{ color: '#A855F7' }}
                  />
                  <Bar dataKey="Matchs" fill="#A855F7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Derniers Matchs ─── */}
      <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', mb: 4 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
          ⚽ Matchs Récents
        </Typography>
        {recentMatchesList.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#64748B', py: 2, textAlign: 'center' }}>Aucun match récent enregistré.</Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentMatchesList.map((m: any) => {
              const isHome = m.homeCoachId === id;
              const outcome = m.homeScore === m.awayScore ? 'DRAW' : (isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore) ? 'WIN' : 'LOSS';
              const outcomeColor = outcome === 'WIN' ? '#00E676' : outcome === 'DRAW' ? '#94A3B8' : '#FF3D00';
              return (
                <Paper
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
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
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={3} sm={2}>
                      <Chip
                        label={outcome === 'WIN' ? 'Victoire' : outcome === 'DRAW' ? 'Nul' : 'Défaite'}
                        size="small"
                        sx={{
                          bgcolor: alpha(outcomeColor, 0.08),
                          color: outcomeColor,
                          border: `1px solid ${alpha(outcomeColor, 0.2)}`,
                          fontWeight: 800,
                          fontSize: '0.65rem'
                        }}
                      />
                    </Grid>
                    <Grid item xs={9} sm={9}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <Box sx={{ flex: 1, textAlign: 'right', pr: 2, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, color: isHome ? '#00E676' : '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.homeTeam?.name}
                          </Typography>
                        </Box>
                        <Box sx={{ px: 2, py: 0.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 70, textAlign: 'center' }}>
                          <Typography sx={{ fontWeight: 900, color: '#F8FAFC', fontSize: '1.1rem', letterSpacing: '0.1em' }}>
                            {m.homeScore} - {m.awayScore}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: 'left', pl: 2, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, color: !isHome ? '#00E676' : '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m.awayTeam?.name}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
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

      {/* ─── Face-à-face (Coaches affrontés) ─── */}
      <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            🤝 Face-à-Face avec d'autres Coachs ({faceToFaceList.length})
          </Typography>
          <Paper
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2,
              py: 0.5,
              borderRadius: 2,
              border: '1px solid rgba(148,163,184,0.12)',
              bgcolor: 'rgba(15,23,42,0.6)',
              '&:focus-within': { border: '1px solid rgba(0,230,118,0.4)' },
            }}
          >
            <SearchIcon sx={{ color: '#475569', mr: 1, fontSize: 18 }} />
            <InputBase
              placeholder="Chercher un coach..."
              value={oppSearch}
              onChange={(e) => { setOppSearch(e.target.value); setOppPage(1); }}
              sx={{ fontSize: '0.85rem', color: '#F8FAFC' }}
            />
          </Paper>
        </Box>

        {filteredOpponents.length === 0 ? (
          <Typography variant="body2" sx={{ color: '#64748B', py: 4, textAlign: 'center' }}>Aucun face-à-face trouvé.</Typography>
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(148,163,184,0.1)', color: '#64748B', fontWeight: 700 } }}>
                    <TableCell>Nom du Coach</TableCell>
                    <TableCell align="center">Matchs</TableCell>
                    <TableCell align="center">Victoires</TableCell>
                    <TableCell align="center">Nuls</TableCell>
                    <TableCell align="center">Défaites</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedOpponents.map((opp) => (
                    <TableRow key={opp.id} sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                      <TableCell sx={{ fontWeight: 700, color: '#F8FAFC' }}>{opp.name}</TableCell>
                      <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{opp.total}</TableCell>
                      <TableCell align="center" sx={{ color: '#00E676', fontWeight: 800 }}>{opp.wins}</TableCell>
                      <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700 }}>{opp.draws}</TableCell>
                      <TableCell align="center" sx={{ color: '#FF3D00', fontWeight: 800 }}>{opp.losses}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => navigate(`/coach/${opp.id}`)}
                          endIcon={<ArrowIcon style={{ fontSize: 12 }} />}
                          sx={{ color: '#00E676', fontWeight: 700, textTransform: 'none', fontSize: '0.75rem', p: 0.5 }}
                        >
                          Profil
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {filteredOpponents.length > oppLimit && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={Math.ceil(filteredOpponents.length / oppLimit)}
                  page={oppPage}
                  onChange={(_, val) => setOppPage(val)}
                  size="small"
                  sx={{
                    '& .MuiPaginationItem-root': { color: '#64748B', fontWeight: 700 },
                    '& .MuiPaginationItem-root.Mui-selected': { bgcolor: 'rgba(0,230,118,0.15)', color: '#00E676' }
                  }}
                />
              </Box>
            )}
          </>
        )}
      </Paper>

    </Box>
  );
};

export default CoachDetail;
