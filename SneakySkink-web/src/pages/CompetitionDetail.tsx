/**
 * Fichier : src/pages/CompetitionDetail.tsx
 * Description : Page de détail d'une compétition. Gère l'affichage des statistiques globales,
 * le classement général en pleine largeur avec Drawer coulissant de tie-breaker (droite-gauche)
 * gérant de multiples critères (PTS, KO, Cas, Morts, Surfs, Passes, Expulsions) et ordonnant
 * dynamiquement les colonnes horizontales du tableau, le filtrage par roster, la recherche de coach,
 * l'arbre du tournoi si Knockout, la liste des matchs et les widgets de statistiques.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Checkbox,
  TablePagination,
  Button,
  Pagination,
  PaginationItem,
  Drawer,
} from '@mui/material';
import {
  SportsSoccer as CompetitionIcon,
  EmojiEvents as LeagueIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  AccessTime as TimeIcon,
  ReportProblem as ForfeitIcon,
  SportsEsports as MatchIcon,
  DragIndicator as DragIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

import { ListGridView } from '../components/ListGridView';
import {
  WidgetMatchsParHeure,
  WidgetRosterJoue,
  WidgetWinrateParRoster,
  WidgetWinrateRosterVsRosters,
  WidgetSkillsChoisis,
  WidgetStatistiquesGlobales,
} from '../components/widgets';

// Métadonnées de rendu pour les colonnes dynamiques
const columnMetadata: Record<string, { label: string; key: string; align: 'center' | 'left' | 'right' }> = {
  points: { label: 'PTS', key: 'points', align: 'center' },
  wins: { label: 'V', key: 'wins', align: 'center' },
  draws: { label: 'N', key: 'draws', align: 'center' },
  losses: { label: 'D', key: 'losses', align: 'center' },
  tdPlus: { label: 'TD+', key: 'tdPlus', align: 'center' },
  tdMinus: { label: 'TD-', key: 'tdMinus', align: 'center' },
  tdDiff: { label: 'Diff', key: 'tdDiff', align: 'center' },
  koPlus: { label: 'KO+', key: 'koPlus', align: 'center' },
  koMinus: { label: 'KO-', key: 'koMinus', align: 'center' },
  casPlus: { label: 'Cas+', key: 'casPlus', align: 'center' },
  casMinus: { label: 'Cas-', key: 'casMinus', align: 'center' },
  mortPlus: { label: 'Mort+', key: 'mortPlus', align: 'center' },
  mortMinus: { label: 'Mort-', key: 'mortMinus', align: 'center' },
  surfPlus: { label: 'Surf+', key: 'surfPlus', align: 'center' },
  surfMinus: { label: 'Surf-', key: 'surfMinus', align: 'center' },
  passes: { label: 'Passe', key: 'passes', align: 'center' },
  expulsions: { label: 'Exp.', key: 'expulsions', align: 'center' },
};

const CompetitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // États pour les données de la compétition et ses statistiques
  const [competition, setCompetition] = useState<any>(null);
  const [competitionStats, setCompetitionStats] = useState<any>(null);
  const [matches24h, setMatches24h] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // États pour l'affichage de la ListGridView des matchs
  const [matchesViewMode, setMatchesViewMode] = useState<'list' | 'grid'>('list');
  const [matchesSortBy, setMatchesSortBy] = useState<'date'>('date');

  // États pour la pagination du classement
  const [standingsPage, setStandingsPage] = useState(0);
  const rowsPerPage = 20;

  // États pour les filtres du classement
  const [selectedRosterFilter, setSelectedRosterFilter] = useState<number | ''>('');
  const [coachSearchQuery, setCoachSearchQuery] = useState<string>('');

  // États pour le Drawer Tie-Breaker
  const [showTieBreaker, setShowTieBreaker] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Critères de tri principaux appliqués au classement (PTS inclus désormais dans le départage)
  const [tieBreakers, setTieBreakers] = useState([
    { id: 'points', label: 'Points (PTS)', active: true },
    { id: 'wins', label: 'Victoires (V)', active: true },
    { id: 'tdDiff', label: 'Différence de TD (Diff)', active: true },
    { id: 'tdPlus', label: 'TD marqués (TD+)', active: true },
    { id: 'draws', label: 'Matchs nuls (N)', active: false },
    { id: 'losses', label: 'Défaites (D)', active: false },
    { id: 'tdMinus', label: 'TD encaissés (TD-)', active: false },
    { id: 'koPlus', label: 'K.O. infligés (KO+)', active: false },
    { id: 'koMinus', label: 'K.O. subis (KO-)', active: false },
    { id: 'casPlus', label: 'Blessures infligées (Cas+)', active: false },
    { id: 'casMinus', label: 'Blessures subies (Cas-)', active: false },
    { id: 'mortPlus', label: 'Morts infligés (Mort+)', active: false },
    { id: 'mortMinus', label: 'Morts subis (Mort-)', active: false },
    { id: 'surfPlus', label: 'Surfs infligés (Surf+)', active: false },
    { id: 'surfMinus', label: 'Surfs subis (Surf-)', active: false },
    { id: 'passes', label: 'Passes réussies (Passe)', active: false },
    { id: 'expulsions', label: 'Expulsions subies (Exp.)', active: false },
  ]);

  // Critères temporaires du Drawer (calcul différé jusqu'à la fermeture/validation)
  const [tempTieBreakers, setTempTieBreakers] = useState([...tieBreakers]);

  // Index de la ronde sélectionnée pour la pagination
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);

  // Chargement initial des données
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getCompetition(id),
      api.getCompetitionStats(id),
      api.getActivity24h({ competitionId: id }),
      api.getActivityStats({ competitionId: id }),
    ])
      .then(([compRes, statsRes, activity24hRes, activityStatsRes]) => {
        const item = compRes.data || compRes;
        setCompetition(item);
        setCompetitionStats(statsRes);
        setMatches24h(activity24hRes);
        setActivityStats(activityStatsRes);
      })
      .catch((err) => {
        console.error('Erreur de chargement de la compétition:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Réinitialiser la page de classement quand le tri ou les filtres changent
  useEffect(() => {
    setStandingsPage(0);
  }, [tieBreakers, selectedRosterFilter, coachSearchQuery]);

  // Formats d'affichage
  const isKnockout = competition?.format === 'Knockout';
  const hasStandings = competition?.format === 'Ladder' || competition?.format === 'RoundRobin' || competition?.format === 'Wissen';

  // Liste de toutes les rondes uniques triées
  const rounds = useMemo(() => {
    if (!competition?.matches) return [];
    return Array.from(new Set(competition.matches.map((m: any) => m.round)))
      .sort((a: any, b: any) => a - b);
  }, [competition]);

  // Initialisation ou ajustement de la ronde sélectionnée par défaut
  useEffect(() => {
    if (rounds.length > 0) {
      setSelectedRoundIndex(rounds.length - 1);
    }
  }, [rounds]);

  // Filtrage des matchs pour la ronde sélectionnée (pour formats championnat/coupe/suisse)
  const filteredMatches = useMemo(() => {
    if (!competition?.matches || rounds.length === 0) return [];
    const safeIndex = Math.min(Math.max(0, selectedRoundIndex), rounds.length - 1);
    const targetRound = rounds[safeIndex];
    return competition.matches.filter((m: any) => m.round === targetRound);
  }, [competition, rounds, selectedRoundIndex]);

  // Matchs du format Ladder (uniquement les 5 derniers matchs validés/joués)
  const lastLadderMatches = useMemo(() => {
    if (!competition?.matches || competition.format !== 'Ladder') return [];
    return [...competition.matches]
      .filter((m: any) => m.status === 'PLAYED' || m.status === 'VALIDATED')
      .sort((a: any, b: any) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 5);
  }, [competition]);

  // Calcul du classement dynamique en mémoire
  const standings = useMemo(() => {
    if (!competition || !competition.matches) return [];

    const teamsMap = new Map<string, {
      teamId: string;
      teamName: string;
      coachId: string;
      coachName: string;
      raceId: number;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      tdPlus: number;
      tdMinus: number;
      tdDiff: number;
      points: number;
      koPlus: number;
      koMinus: number;
      casPlus: number;
      casMinus: number;
      mortPlus: number;
      mortMinus: number;
      surfPlus: number;
      surfMinus: number;
      passes: number;
      expulsions: number;
    }>();

    const getOrCreate = (teamId: string, teamName: string, coachId: string, coachName: string, raceId: number) => {
      if (!teamsMap.has(teamId)) {
        teamsMap.set(teamId, {
          teamId,
          teamName: teamName || 'Équipe inconnue',
          coachId,
          coachName: coachName || 'Inconnu',
          raceId: raceId ?? 0,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          tdPlus: 0,
          tdMinus: 0,
          tdDiff: 0,
          points: 0,
          koPlus: 0,
          koMinus: 0,
          casPlus: 0,
          casMinus: 0,
          mortPlus: 0,
          mortMinus: 0,
          surfPlus: 0,
          surfMinus: 0,
          passes: 0,
          expulsions: 0,
        });
      }
      return teamsMap.get(teamId)!;
    };

    // Remplissage avec toutes les équipes uniques des matchs
    competition.matches.forEach((m: any) => {
      if (m.homeTeamId && m.homeTeam) {
        getOrCreate(m.homeTeamId, m.homeTeam.name, m.homeCoachId, m.homeCoach?.name, m.homeTeam.raceId);
      }
      if (m.awayTeamId && m.awayTeam) {
        getOrCreate(m.awayTeamId, m.awayTeam.name, m.awayCoachId, m.awayCoach?.name, m.awayTeam.raceId);
      }
    });

    // Accumulation des résultats de matchs
    competition.matches.forEach((m: any) => {
      const isPlayed = m.status === 'PLAYED' || m.status === 'VALIDATED';
      if (!isPlayed || !m.homeTeamId || !m.awayTeamId) return;

      const home = getOrCreate(m.homeTeamId, m.homeTeam?.name, m.homeCoachId, m.homeCoach?.name, m.homeTeam.raceId);
      const away = getOrCreate(m.awayTeamId, m.awayTeam?.name, m.awayCoachId, m.awayCoach?.name, m.awayTeam.raceId);

      home.played += 1;
      away.played += 1;

      home.tdPlus += m.homeScore;
      home.tdMinus += m.awayScore;
      away.tdPlus += m.awayScore;
      away.tdMinus += m.homeScore;

      const hs = m.homeStats || {};
      const as = m.awayStats || {};

      // K.O+ et K.O-
      home.koPlus += hs.inflictedko || 0;
      home.koMinus += hs.sustainedko || as.inflictedko || 0;
      away.koPlus += as.inflictedko || 0;
      away.koMinus += as.sustainedko || hs.inflictedko || 0;

      // Cas+ et Cas-
      home.casPlus += hs.inflictedcasualties || 0;
      home.casMinus += hs.sustainedcasualties || as.inflictedcasualties || 0;
      away.casPlus += as.inflictedcasualties || 0;
      away.casMinus += as.sustainedcasualties || hs.inflictedcasualties || 0;

      // Mort+ et Mort-
      home.mortPlus += hs.inflicteddead || 0;
      home.mortMinus += hs.sustaineddead || as.inflicteddead || 0;
      away.mortPlus += as.inflicteddead || 0;
      away.mortMinus += as.sustaineddead || hs.inflicteddead || 0;

      // Surf+ et Surf-
      home.surfPlus += hs.inflictedpushouts || 0;
      home.surfMinus += as.inflictedpushouts || 0;
      away.surfPlus += as.inflictedpushouts || 0;
      away.surfMinus += hs.inflictedpushouts || 0;

      // Passes
      home.passes += hs.inflictedpasses || 0;
      away.passes += as.inflictedpasses || 0;

      // Expulsions
      home.expulsions += hs.sustainedexpulsions || 0;
      away.expulsions += as.sustainedexpulsions || 0;

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

    const list = Array.from(teamsMap.values()).map((t) => {
      t.tdDiff = t.tdPlus - t.tdMinus;
      return t;
    });

    // Tri lexicographique
    return list.sort((a, b) => {
      for (const tb of tieBreakers) {
        if (!tb.active) continue;

        if (tb.id === 'points') {
          if (a.points !== b.points) return b.points - a.points;
        } else if (tb.id === 'wins') {
          if (a.wins !== b.wins) return b.wins - a.wins;
        } else if (tb.id === 'tdDiff') {
          if (a.tdDiff !== b.tdDiff) return b.tdDiff - a.tdDiff;
        } else if (tb.id === 'tdPlus') {
          if (a.tdPlus !== b.tdPlus) return b.tdPlus - a.tdPlus;
        } else if (tb.id === 'draws') {
          if (a.draws !== b.draws) return b.draws - a.draws;
        } else if (tb.id === 'losses') {
          if (a.losses !== b.losses) return a.losses - b.losses;
        } else if (tb.id === 'tdMinus') {
          if (a.tdMinus !== b.tdMinus) return a.tdMinus - b.tdMinus;
        } else if (tb.id === 'koPlus') {
          if (a.koPlus !== b.koPlus) return b.koPlus - a.koPlus;
        } else if (tb.id === 'koMinus') {
          if (a.koMinus !== b.koMinus) return a.koMinus - b.koMinus;
        } else if (tb.id === 'casPlus') {
          if (a.casPlus !== b.casPlus) return b.casPlus - a.casPlus;
        } else if (tb.id === 'casMinus') {
          if (a.casMinus !== b.casMinus) return a.casMinus - b.casMinus;
        } else if (tb.id === 'mortPlus') {
          if (a.mortPlus !== b.mortPlus) return b.mortPlus - a.mortPlus;
        } else if (tb.id === 'mortMinus') {
          if (a.mortMinus !== b.mortMinus) return a.mortMinus - b.mortMinus;
        } else if (tb.id === 'surfPlus') {
          if (a.surfPlus !== b.surfPlus) return b.surfPlus - a.surfPlus;
        } else if (tb.id === 'surfMinus') {
          if (a.surfMinus !== b.surfMinus) return a.surfMinus - b.surfMinus;
        } else if (tb.id === 'passes') {
          if (a.passes !== b.passes) return b.passes - a.passes;
        } else if (tb.id === 'expulsions') {
          if (a.expulsions !== b.expulsions) return a.expulsions - b.expulsions;
        }
      }

      return a.teamName.localeCompare(b.teamName);
    });
  }, [competition, tieBreakers]);

  // Récupérer les rosters uniques présents dans le classement pour le filtre
  const rostersInStandings = useMemo(() => {
    const raceIds = new Set<number>();
    standings.forEach(item => {
      if (item.raceId !== undefined) {
        raceIds.add(item.raceId);
      }
    });
    return Array.from(raceIds).sort((a, b) => a - b);
  }, [standings]);

  // Filtrage du classement en direct
  const filteredStandings = useMemo(() => {
    return standings.filter(item => {
      const matchesRoster = selectedRosterFilter === '' || item.raceId === selectedRosterFilter;
      const matchesCoach = coachSearchQuery.trim() === '' || 
        item.coachName.toLowerCase().includes(coachSearchQuery.toLowerCase());
      return matchesRoster && matchesCoach;
    });
  }, [standings, selectedRosterFilter, coachSearchQuery]);

  // Pagination sur le classement filtré (avec repli de sécurité si la page est hors limites)
  const paginatedStandings = useMemo(() => {
    let page = standingsPage;
    if (page * rowsPerPage >= filteredStandings.length) {
      page = 0;
    }
    const start = page * rowsPerPage;
    return filteredStandings.slice(start, start + rowsPerPage);
  }, [filteredStandings, standingsPage]);

  // Calcul des statistiques cumulées de tous les matchs de la compétition
  const globalMatchStats = useMemo(() => {
    const stats = { touchdowns: 0, kos: 0, injuries: 0, deaths: 0, surfs: 0, passes: 0, expulsions: 0 };
    if (!competition || !competition.matches) return stats;

    competition.matches.forEach((m: any) => {
      const isPlayed = m.status === 'PLAYED' || m.status === 'VALIDATED';
      if (!isPlayed) return;

      stats.touchdowns += (m.homeScore || 0) + (m.awayScore || 0);

      const hs = m.homeStats || {};
      const as = m.awayStats || {};

      stats.kos += (hs.inflictedko || 0) + (as.inflictedko || 0);
      stats.injuries += (hs.inflictedcasualties || 0) + (as.inflictedcasualties || 0);
      stats.deaths += (hs.inflicteddead || 0) + (as.inflicteddead || 0);
      stats.surfs += (hs.inflictedpushouts || 0) + (as.inflictedpushouts || 0);
      stats.passes += (hs.inflictedpasses || 0) + (as.inflictedpasses || 0);
      stats.expulsions += (hs.sustainedexpulsions || 0) + (as.sustainedexpulsions || 0);
    });

    return stats;
  }, [competition]);

  // En-têtes dynamiques triés horizontalement selon l'ordre du tie-breaker
  const dynamicHeaders = useMemo(() => {
    return tieBreakers.map(tb => {
      const meta = columnMetadata[tb.id];
      return {
        id: tb.id,
        label: meta.label,
        align: meta.align,
        active: tb.active,
        key: meta.key,
      };
    });
  }, [tieBreakers]);

  // Gestion du Drawer Tie-Breaker
  const toggleTieBreakerPanel = () => {
    if (showTieBreaker) {
      setTieBreakers([...tempTieBreakers]);
    } else {
      setTempTieBreakers([...tieBreakers]);
    }
    setShowTieBreaker(!showTieBreaker);
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updated = [...tempTieBreakers];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);

    setDraggedIndex(index);
    setTempTieBreakers(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggedIndex(null);
  };

  const toggleTempTieBreaker = (id: string) => {
    setTempTieBreakers((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item))
    );
  };

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
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>
          Compétition introuvable
        </Typography>
      </Box>
    );
  }

  const formatLabels: Record<string, string> = {
    Knockout: 'Élimination Directe',
    RoundRobin: 'Championnat Toutes Rondes',
    Wissen: 'Ronde Suisse',
    Ladder: 'Échelle',
  };

  const summary = competitionStats?.summary || { totalMatches: 0, forfeits: 0, coachesCount: 0 };
  const forfeitPercentage = summary.totalMatches > 0
    ? Number(((summary.forfeits / summary.totalMatches) * 100).toFixed(1))
    : 0;

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 }, px: 2, display: 'flex', flexDirection: 'column', gap: 3, width: '100%', boxSizing: 'border-box' }}>
      
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, minWidth: 0, flex: 1 }}>
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
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                
                <Box
                  onClick={() => navigate(`/ligue/${competition.leagueId}`)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                    '&:hover': { color: '#00E676' },
                  }}
                >
                  <LeagueIcon sx={{ fontSize: 13 }} />
                  <Typography variant="caption">
                    Ligue: {competition.leagueName}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Métadonnées additionnelles */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignSelf: { xs: 'flex-start', md: 'auto' } }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Format
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CompetitionIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                {formatLabels[competition.format] || competition.format}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Dernière Synchro
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: 16, color: '#10B981' }} />
                {competition.updatedAt ? new Date(competition.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Aucune'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* ─── Statistiques Globales ───────────────────────────────────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <Paper sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
            Matchs Joués
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <MatchIcon sx={{ fontSize: 24 }} /> {summary.totalMatches}
          </Typography>
        </Paper>

        <Paper
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            border: '1px solid rgba(0,230,118,0.15)',
            bgcolor: 'rgba(0,230,118,0.02)',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, textTransform: 'uppercase', display: 'block', mb: 1 }}>
            Coachs Actifs
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#00E676', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <PeopleIcon sx={{ fontSize: 24 }} /> {summary.coachesCount}
          </Typography>
        </Paper>

        <Paper sx={{ p: 2.5, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 1 }}>
            Taux de Forfait / Concession
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: '1.8rem', color: '#FF3D00', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <ForfeitIcon sx={{ fontSize: 24 }} /> {forfeitPercentage}%
          </Typography>
        </Paper>
      </Box>

      {/* ─── Classement & Drawer Tie-Breaker ( Ladder, Toute Ronde, Suisse ) ── */}
      {hasStandings && (
        <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
          <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', width: '100%', boxSizing: 'border-box', overflowX: 'auto' }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                📊 Classement général
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
                {/* Recherche par nom de coach */}
                <input
                  type="text"
                  placeholder="Rechercher un coach..."
                  value={coachSearchQuery}
                  onChange={(e) => {
                    setCoachSearchQuery(e.target.value);
                    setStandingsPage(0);
                  }}
                  style={{
                    height: 32,
                    backgroundColor: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(148,163,184,0.15)',
                    borderRadius: 6,
                    color: '#F8FAFC',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0 10px',
                    outline: 'none',
                    width: 160,
                  }}
                />

                {/* Filtre par Roster */}
                <select
                  value={selectedRosterFilter}
                  onChange={(e) => {
                    setSelectedRosterFilter(e.target.value === '' ? '' : Number(e.target.value));
                    setStandingsPage(0);
                  }}
                  style={{
                    height: 32,
                    backgroundColor: 'rgba(15,23,42,0.5)',
                    border: '1px solid rgba(148,163,184,0.15)',
                    borderRadius: 6,
                    color: '#F8FAFC',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0 10px',
                    cursor: 'pointer',
                    outline: 'none',
                  }}
                >
                  <option value="" style={{ backgroundColor: '#0F172A' }}>Tous les rosters</option>
                  {rostersInStandings.map(raceId => {
                    const info = getRaceInfo(raceId);
                    return (
                      <option key={raceId} value={raceId} style={{ backgroundColor: '#0F172A' }}>
                        {info.emoji} {info.name}
                      </option>
                    );
                  })}
                </select>

                <Button
                  size="small"
                  variant="outlined"
                  onClick={toggleTieBreakerPanel}
                  sx={{
                    height: 32,
                    color: showTieBreaker ? '#00E676' : '#94A3B8',
                    borderColor: showTieBreaker ? '#00E676' : 'rgba(148,163,184,0.15)',
                    '&:hover': {
                      borderColor: '#00E676',
                      bgcolor: 'rgba(0, 230, 118, 0.04)',
                    },
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  ⚙️ Départage
                </Button>
              </Box>
            </Box>

            {filteredStandings.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
                <Typography variant="body2">Aucune équipe ne correspond aux critères de recherche.</Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(148,163,184,0.1)', color: '#64748B', fontWeight: 700 } }}>
                        <TableCell align="center" sx={{ width: 50 }}>Pos</TableCell>
                        <TableCell>Équipe</TableCell>
                        <TableCell>Coach</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#3B82F6' }}>#m</TableCell>

                        {/* Colonnes dynamiques triées horizontalement */}
                        {dynamicHeaders.map(col => (
                          <TableCell
                            key={col.id}
                            align={col.align}
                            sx={{
                              fontWeight: col.active ? 800 : 500,
                              color: col.active ? '#F8FAFC' : 'rgba(148, 163, 184, 0.35)',
                              transition: 'all 0.3s',
                            }}
                          >
                            {col.label}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paginatedStandings.map((row) => {
                        const globalIdx = standings.findIndex((t) => t.teamId === row.teamId);
                        return (
                          <TableRow
                            key={row.teamId}
                            sx={{
                              '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' },
                              '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' }
                            }}
                          >
                            <TableCell align="center" sx={{ fontWeight: 800, color: (globalIdx !== -1 && globalIdx < 3) ? '#00E676' : '#64748B' }}>
                              {globalIdx !== -1 ? globalIdx + 1 : '-'}
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
                            <TableCell align="center" sx={{ color: '#3B82F6', fontWeight: 800 }}>{row.played}</TableCell>

                            {/* Données dynamiques triées horizontalement */}
                            {dynamicHeaders.map(col => {
                              const val = (row as any)[col.key];
                              const isDiff = col.id === 'tdDiff';
                              const displayVal = isDiff && val > 0 ? `+${val}` : val;

                              let valColor = col.active ? '#F8FAFC' : 'rgba(148, 163, 184, 0.25)';
                              if (col.active) {
                                if (col.id === 'points') {
                                  valColor = '#F59E0B'; // orange/ambre pour les points actifs
                                } else if (col.id === 'wins' || col.id === 'tdDiff' || col.id === 'koPlus' || col.id === 'casPlus' || col.id === 'mortPlus' || col.id === 'surfPlus' || col.id === 'passes') {
                                  valColor = '#00E676';
                                } else if (col.id === 'losses' || col.id === 'tdMinus' || col.id === 'koMinus' || col.id === 'casMinus' || col.id === 'mortMinus' || col.id === 'surfMinus' || col.id === 'expulsions') {
                                  valColor = '#FF3D00';
                                }
                              }

                              return (
                                <TableCell
                                  key={col.id}
                                  align={col.align}
                                  sx={{
                                    color: valColor,
                                    fontWeight: col.active ? 700 : 500,
                                    transition: 'all 0.3s',
                                  }}
                                >
                                  {displayVal}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <TablePagination
                  rowsPerPageOptions={[20]}
                  component="div"
                  count={filteredStandings.length}
                  rowsPerPage={rowsPerPage}
                  page={standingsPage}
                  onPageChange={(_, newPage) => setStandingsPage(newPage)}
                  sx={{
                    color: '#94A3B8',
                    borderTop: '1px solid rgba(148,163,184,0.06)',
                    '& .MuiTablePagination-actions': {
                      color: '#00E676',
                    },
                    '& .MuiIconButton-root.Mui-disabled': {
                      color: 'rgba(148,163,184,0.3)',
                    }
                  }}
                />
              </>
            )}
          </Paper>

          {/* Drawer glissant de droite à gauche pour les Tie-Breakers */}
          <Drawer
            anchor="right"
            open={showTieBreaker}
            onClose={toggleTieBreakerPanel}
            PaperProps={{
              sx: {
                width: { xs: '100%', sm: 360 },
                p: 3,
                bgcolor: '#0F172A',
                borderLeft: '1px solid rgba(148, 163, 184, 0.08)',
                background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
                color: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box',
              }
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 1 }}>
              ⚙️ Départages (Tie-Breaker)
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 3 }}>
              Glissez-déposez pour réordonner la priorité. Cochez pour activer. Les changements s'appliqueront à la fermeture du volet.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, overflowY: 'auto', pr: 0.5, mb: 2 }}>
              {tempTieBreakers.map((tb, index) => (
                <Paper
                  key={tb.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: draggedIndex === index ? '#00E676' : 'rgba(148,163,184,0.06)',
                    background: draggedIndex === index 
                      ? 'rgba(0,230,118,0.05)' 
                      : tb.active 
                        ? 'rgba(30,41,59,0.4)' 
                        : 'rgba(15,23,42,0.2)',
                    opacity: draggedIndex === index ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'grab',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'rgba(0,230,118,0.2)',
                      background: 'rgba(30,41,59,0.6)',
                    },
                    '&:active': {
                      cursor: 'grabbing',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <DragIcon sx={{ color: draggedIndex === index ? '#00E676' : '#475569', fontSize: 20 }} />
                    <Typography sx={{ 
                      fontWeight: 700, 
                      fontSize: '0.85rem', 
                      color: tb.active ? '#F8FAFC' : '#64748B',
                      textDecoration: tb.active ? 'none' : 'line-through' 
                    }}>
                      {tb.label}
                    </Typography>
                  </Box>
                  
                  <Checkbox
                    checked={tb.active}
                    onChange={() => toggleTempTieBreaker(tb.id)}
                    size="small"
                    sx={{
                      color: '#475569',
                      '&.Mui-checked': {
                        color: '#00E676',
                      },
                      p: 0.5,
                    }}
                  />
                </Paper>
              ))}
            </Box>

            <Box sx={{ pt: 2, borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
              <Button
                fullWidth
                variant="contained"
                onClick={toggleTieBreakerPanel}
                sx={{
                  bgcolor: '#00E676',
                  color: '#0F172A',
                  fontWeight: 800,
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#00C853',
                  }
                }}
              >
                Appliquer & Fermer
              </Button>
            </Box>
          </Drawer>
        </Box>
      )}

      {/* ─── Arbre à Élimination Directe ( Knockout uniquement ) ──────────── */}
      {isKnockout && (
        <Box sx={{ width: '100%' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2 }}>
            🏆 Arbre de tournoi
          </Typography>
          
          {bracketRounds.length === 0 ? (
            <Paper sx={{ p: 4, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center', color: '#64748B', width: '100%', boxSizing: 'border-box' }}>
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
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00E676', textAlign: 'center', mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {round.name}
                  </Typography>

                  <Divider sx={{ borderColor: 'rgba(148,163,184,0.08)', mb: 3 }} />

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
                          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.6rem', position: 'absolute', top: 4, right: 8 }}>
                            Match {m.id.substring(0, 4)}
                          </Typography>

                          {/* Domicile */}
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

                          {/* Extérieur */}
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

      {/* ─── Matchs de la Compétition ( Toute Ronde, Ronde Suisse, Knockout ) ── */}
      {(isKnockout || competition.format === 'RoundRobin' || competition.format === 'Wissen') && (
        <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', width: '100%', boxSizing: 'border-box' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
            ⚽ Matchs de la compétition
          </Typography>

          {rounds.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucun match disponible pour cette compétition.</Typography>
            </Box>
          ) : (
            <Box sx={{ width: '100%' }}>
              {/* Journée en cours */}
              <Typography variant="subtitle2" sx={{ color: '#00E676', fontWeight: 800, mb: 3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Journée {rounds[selectedRoundIndex]}
              </Typography>

              <ListGridView
                loading={false}
                isEmpty={filteredMatches.length === 0}
                viewMode={matchesViewMode}
                onViewModeChange={setMatchesViewMode}
                sortBy={matchesSortBy}
                onSortChange={setMatchesSortBy}
                sortOptions={[
                  { value: 'date', label: 'Date' }
                ]}
                renderEmptyState={() => (
                  <Box sx={{ py: 4, textAlign: 'center', color: '#64748B' }}>
                    <Typography variant="body2">Aucun match pour cette journée.</Typography>
                  </Box>
                )}
                renderList={() => (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
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
                            {/* Journée / Date */}
                            <Grid item xs={12} sm={3} sx={{ borderRight: { sm: '1px solid rgba(148,163,184,0.06)' }, pr: 1 }}>
                              <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Journée {match.round}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem' }}>
                                {new Date(match.startedAt).toLocaleDateString('fr-FR')}
                              </Typography>
                            </Grid>

                            {/* Équipes */}
                            <Grid item xs={12} sm={8}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <Box sx={{ flex: 1, textAlign: 'right', pr: 2, minWidth: 0 }}>
                                  <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {match.homeTeam?.name || 'En attente'}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#475569' }}>
                                    {match.homeCoach?.name || 'Coach Inconnu'}
                                  </Typography>
                                </Box>

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

                            {/* Flèche d'action */}
                            <Grid item xs={12} sm={1} sx={{ textAlign: 'right', display: { xs: 'none', sm: 'block' } }}>
                              <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
                renderGrid={() => (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                      gap: 2,
                      width: '100%',
                    }}
                  >
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
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: 120,
                            '&:hover': {
                              border: '1px solid rgba(0,230,118,0.2)',
                              bgcolor: 'rgba(0,230,118,0.02)',
                              transform: 'translateY(-2px)',
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
                              Journée {match.round}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {new Date(match.startedAt).toLocaleDateString('fr-FR')}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                {match.homeTeam?.name || 'En attente'}
                              </Typography>
                              {isPlayed && (
                                <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '0.9rem' }}>
                                  {match.homeScore}
                                </Typography>
                              )}
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                                {match.awayTeam?.name || 'En attente'}
                              </Typography>
                              {isPlayed && (
                                <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '0.9rem' }}>
                                  {match.awayScore}
                                </Typography>
                              )}
                            </Box>
                            {!isPlayed && (
                              <Typography variant="caption" sx={{ color: '#64748B', alignSelf: 'center', mt: 0.5, fontWeight: 700 }}>
                                VS
                              </Typography>
                            )}
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              />

              {/* Pagination Ronde par Ronde */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <Pagination
                  count={rounds.length}
                  page={selectedRoundIndex + 1}
                  onChange={(_, page) => setSelectedRoundIndex(page - 1)}
                  renderItem={(item) => (
                    <PaginationItem
                      {...item}
                      sx={{
                        color: '#94A3B8',
                        '&.Mui-selected': {
                          bgcolor: 'rgba(0, 230, 118, 0.15)',
                          color: '#00E676',
                          fontWeight: 800,
                          border: '1px solid rgba(0, 230, 118, 0.3)',
                        },
                        '&:hover': {
                          bgcolor: 'rgba(255,255,255,0.05)',
                        }
                      }}
                    />
                  )}
                />
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* ─── Matchs du Format Ladder ( 5 derniers matchs uniquement ) ───── */}
      {competition.format === 'Ladder' && (
        <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)', width: '100%', boxSizing: 'border-box' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
            ⚽ 5 Derniers Matchs de la compétition
          </Typography>

          {lastLadderMatches.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucun match joué disponible pour le moment.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {lastLadderMatches.map((match: any) => {
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
                      <Grid item xs={12} sm={3} sx={{ borderRight: { sm: '1px solid rgba(148,163,184,0.06)' }, pr: 1 }}>
                        <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Ladder Match
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem' }}>
                          {new Date(match.startedAt).toLocaleDateString('fr-FR')}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} sm={8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ flex: 1, textAlign: 'right', pr: 2, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {match.homeTeam?.name || 'En attente'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#475569' }}>
                              {match.homeCoach?.name || 'Coach Inconnu'}
                            </Typography>
                          </Box>

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

      {/* ─── Graphiques d'Activité Horaire ( Récente & Globale ) ─────────── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <WidgetMatchsParHeure matches={matches24h} />
        <WidgetMatchsParHeure hourlyActivity={activityStats?.hourlyActivity} />
      </Box>

      {/* ─── Statistiques des Rosters & Compétences ─────────────────────── */}
      <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          📊 Statistiques des Rosters & Compétences
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            width: '100%',
            mb: 3,
          }}
        >
          <WidgetRosterJoue data={competitionStats?.rostersPlayed || []} />
          <WidgetWinrateParRoster data={competitionStats?.rosterWinrates || []} />
          <WidgetWinrateRosterVsRosters matches={competitionStats?.allMatches || []} focusId={competition.id} />
          <WidgetSkillsChoisis
            skillsData={competitionStats?.popularSkills || []}
            skillsByRoster={competitionStats?.skillsByRoster || []}
          />
        </Box>

        <WidgetStatistiquesGlobales data={globalMatchStats} />
      </Box>
      
    </Box>
  );
};

export default CompetitionDetail;
