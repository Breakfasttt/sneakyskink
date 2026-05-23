/**
 * Fichier : src/pages/LeagueDetail.tsx
 * Description : Page de détail d'une ligue avec statistiques, graphiques d'activité 24h,
 * liste des compétitions unifiée (liste/grille), widgets de rosters et historique d'activité.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Button,
  Chip,
  Divider,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import {
  EmojiEvents as LeagueIcon,
  SportsSoccer as CompetitionIcon,
  ContentCopy as CopyIcon,
  People as PeopleIcon,
  CalendarToday as DateIcon,
  AccessTime as TimeIcon,
  ReportProblem as ForfeitIcon,
  SportsEsports as MatchIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { api } from '../api';

import { ListGridView } from '../components/ListGridView';
import { ItemCard } from '../components/ItemCard';
import {
  WidgetMatchsSur24h,
  WidgetMatchsParHeure,
  WidgetCalendrierMatchs,
  WidgetRosterJoue,
  WidgetWinrateParRoster,
  WidgetWinrateRosterVsRosters,
  WidgetSkillsChoisis,
} from '../components/widgets';

const LeagueDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [league, setLeague] = useState<any>(null);
  const [leagueStats, setLeagueStats] = useState<any>(null);
  const [matches24h, setMatches24h] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAllCompetitions, setShowAllCompetitions] = useState(false);
  const [copied, setCopied] = useState(false);

  const [compViewMode, setCompViewMode] = useState<'list' | 'grid'>('list');
  const [compSortBy, setCompSortBy] = useState<'name' | 'teams' | 'status'>('name');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.getLeague(id),
      api.getLeagueStats(id),
      api.getActivity24h({ leagueId: id }),
      api.getActivityStats({ leagueId: id }),
    ])
      .then(([leagueRes, statsRes, activity24hRes, activityStatsRes]) => {
        setLeague(leagueRes);
        setLeagueStats(statsRes);
        setMatches24h(activity24hRes);
        setActivityStats(activityStatsRes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Copier l'ID de la ligue
  const handleCopyId = () => {
    if (league?.id) {
      navigator.clipboard.writeText(league.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Traitement, filtrage et tri local des compétitions
  const processedCompetitions = useMemo(() => {
    if (!league?.competitions) return [];

    let result = league.competitions;
    if (!showAllCompetitions) {
      result = result.filter(
        (comp: any) => comp.status === 'InProgress' || comp.status === 'Scheduled'
      );
    }

    return [...result].sort((a, b) => {
      if (compSortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (compSortBy === 'teams') {
        const teamsA = a.teamsCount ?? 0;
        const teamsB = b.teamsCount ?? 0;
        return teamsB - teamsA;
      }
      if (compSortBy === 'status') {
        return a.status.localeCompare(b.status);
      }
      return 0;
    });
  }, [league?.competitions, showAllCompetitions, compSortBy]);

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
  const recentMatches = leagueStats?.matches || [];

  // Calcul du taux de forfait
  const forfeitPercentage = summary.totalMatches > 0
    ? Number(((summary.forfeits / summary.totalMatches) * 100).toFixed(1))
    : 0;

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 }, px: 2 }}>
      
      {/* #block titre */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 3,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, minWidth: 0, flex: 1 }}>
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
                overflow: 'hidden',
              }}
            >
              {league.logo ? (
                <Box component="img" src={league.logo} alt="Logo" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <LeagueIcon sx={{ fontSize: 36 }} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

                {/* ID de la Ligue cliquable pour copier */}
                <Box
                  onClick={handleCopyId}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    transition: 'color 0.2s',
                    '&:hover': { color: '#F8FAFC' },
                  }}
                >
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                    ID: {league.id}
                  </Typography>
                  <CopyIcon sx={{ fontSize: 12 }} />
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Métadonnées additionnelles du titre */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignSelf: { xs: 'flex-start', md: 'auto' } }}>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Coachs Enregistrés
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PeopleIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                {league.gamerCount ?? summary.coachesCount}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Dernière Activité
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DateIcon sx={{ fontSize: 16, color: '#A855F7' }} />
                {summary.lastActivity ? new Date(summary.lastActivity).toLocaleDateString('fr-FR') : 'Aucune'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                Dernière Synchro
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TimeIcon sx={{ fontSize: 16, color: '#10B981' }} />
                {league.updatedAt ? new Date(league.updatedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Aucune'}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* #block stats de ligue */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 4,
          width: '100%',
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

        {/* Nombre de coachs cliquable */}
        <Paper
          onClick={() => navigate(`/coachs?leagueId=${league.id}`)}
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            border: '1px solid rgba(0,230,118,0.15)',
            bgcolor: 'rgba(0,230,118,0.02)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
            '&:hover': {
              bgcolor: 'rgba(0,230,118,0.06)',
              borderColor: '#00E676',
              transform: 'translateY(-2px)',
            }
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



      {/* Les deux graphiques d'activité horaire */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mb: 4,
          width: '100%',
        }}
      >
        {/* Activité Récente (Dernières 24h UTC) */}
        <WidgetMatchsParHeure matches={matches24h} />
        {/* Répartition horaire globale */}
        <WidgetMatchsParHeure hourlyActivity={activityStats?.hourlyActivity} />
      </Box>

      {/* #block compétition */}
      <Box sx={{ mb: 4, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          🎯 Compétitions de la Ligue
        </Typography>

        <ListGridView
          loading={false}
          isEmpty={processedCompetitions.length === 0}
          viewMode={compViewMode}
          onViewModeChange={setCompViewMode}
          sortBy={compSortBy}
          onSortChange={setCompSortBy}
          sortOptions={[
            { value: 'name', label: 'Nom' },
            { value: 'teams', label: 'Nombre d\'équipes' },
            { value: 'status', label: 'Statut' },
          ]}
          extraControls={
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
          }
          renderEmptyState={() => (
            <Paper
              elevation={0}
              sx={{
                p: 6,
                textAlign: 'center',
                border: '1px dashed rgba(148,163,184,0.08)',
                borderRadius: 3,
                bgcolor: 'rgba(15,23,42,0.4)',
                width: '100%',
              }}
            >
              <CompetitionIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                Aucune compétition trouvée
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Activez l'option pour afficher les compétitions terminées ou planifiées.
              </Typography>
            </Paper>
          )}
          renderList={() => (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(148,163,184,0.08)',
                background: 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.4) 100%)',
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <Table sx={{ minWidth: 600 }}>
                <TableHead sx={{ bgcolor: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, pl: 4 }}>Compétition</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Format</TableCell>
                    <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Matchs</TableCell>
                    <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Équipes</TableCell>
                    <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Statut</TableCell>
                    <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, width: 80, pr: 4 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {processedCompetitions.map((comp: any) => (
                    <TableRow
                      key={comp.id}
                      onClick={() => navigate(`/competition/${comp.id}`)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        '&:hover': {
                          bgcolor: 'rgba(0, 230, 118, 0.04)',
                        },
                        '&:last-child td, &:last-child th': { border: 0 },
                      }}
                    >
                      <TableCell sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2, pl: 4 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'rgba(59,130,246,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.15)' }}>
                            <CompetitionIcon sx={{ fontSize: 18 }} />
                          </Box>
                          <Typography sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {comp.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2, color: '#94A3B8', fontWeight: 600 }}>
                        {comp.format === 'Knockout' ? 'Phase finale' : 'Championnat'}
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2, color: '#F8FAFC', fontWeight: 600 }}>
                        {comp.matchesCount ?? 0}
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2, color: '#F8FAFC', fontWeight: 600 }}>
                        {comp.teamsMax ? `${comp.teamsCount ?? 0}/${comp.teamsMax}` : `${comp.teamsCount ?? 0}`}
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                        <Chip
                          label={comp.status === 'InProgress' ? 'En cours' : comp.status === 'Scheduled' ? 'Planifiée' : 'Terminée'}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: comp.status === 'InProgress' ? 'rgba(59,130,246,0.08)' : 'rgba(148,163,184,0.08)',
                            color: comp.status === 'InProgress' ? '#3B82F6' : '#94A3B8',
                            border: `1px solid ${comp.status === 'InProgress' ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.15)'}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2, pr: 4 }}>
                        <IconButton
                          size="small"
                          sx={{
                            color: '#64748B',
                            '&:hover': { color: '#00E676' }
                          }}
                        >
                          <ArrowIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          renderGrid={() => (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 2,
                width: '100%',
              }}
            >
              {processedCompetitions.map((comp: any) => (
                <ItemCard
                  key={comp.id}
                  title={comp.name}
                  onClick={() => navigate(`/competition/${comp.id}`)}
                  icon={<CompetitionIcon sx={{ fontSize: 20 }} />}
                  iconBgColor="rgba(59,130,246,0.06)"
                  iconBorderColor="rgba(59,130,246,0.15)"
                  iconColor="#3B82F6"
                  subtitle={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={comp.status === 'InProgress' ? 'En cours' : comp.status === 'Scheduled' ? 'Planifiée' : 'Terminée'}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.55rem',
                          fontWeight: 700,
                          bgcolor: comp.status === 'InProgress' ? 'rgba(59,130,246,0.08)' : 'rgba(148,163,184,0.08)',
                          color: comp.status === 'InProgress' ? '#3B82F6' : '#94A3B8',
                        }}
                      />
                    </Box>
                  }
                  description={
                    <>
                      {comp.teamsMax ? `${comp.teamsCount ?? 0}/${comp.teamsMax}` : `${comp.teamsCount ?? 0}`} équipes · {comp.matchesCount ?? 0} match{comp.matchesCount > 1 ? 's' : ''} · {comp.format === 'Knockout' ? 'Coupe' : 'Ligue'}
                    </>
                  }
                />
              ))}
            </Box>
          )}
        />
      </Box>

      {/* #block widgets de statistiques de rosters et de skills de la ligue */}
      <Box sx={{ mb: 4, width: '100%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          📊 Statistiques des Rosters & Compétences
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
            width: '100%',
          }}
        >
          {/* Les Roster joués */}
          <WidgetRosterJoue data={leagueStats?.rostersPlayed || []} />

          {/* Winrate par roster */}
          <WidgetWinrateParRoster data={leagueStats?.rosterWinrates || []} />

          {/* Winrate roster vs roster */}
          <WidgetWinrateRosterVsRosters matches={leagueStats?.allMatches || []} focusId={league.id} />

          {/* Skills choisis */}
          <WidgetSkillsChoisis
            skillsData={leagueStats?.popularSkills || []}
            skillsByRoster={leagueStats?.skillsByRoster || []}
          />
        </Box>
      </Box>

      {/* #block widgets / Activité Récente */}
      <Box sx={{ width: '100%' }}>
        {/* Matchs Récents */}
        <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 3 }}>
            ⚽ Matchs Récents
          </Typography>

          {recentMatches.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center', color: '#64748B' }}>
              <Typography variant="body2">Aucun match disponible pour le moment.</Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentMatches.slice(0, 5).map((m: any) => (
                <Paper
                  key={m.id}
                  onClick={() => navigate(`/match/${m.id}`)}
                  sx={{
                    p: 2,
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800 }}>
                      {m.competition?.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#475569' }}>
                      {new Date(m.startedAt).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1, minWidth: 0, pr: 1 }}>
                      <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.homeTeam?.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.homeCoach?.name || 'Inconnu'}
                      </Typography>
                    </Box>

                    <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', minWidth: 60, textAlign: 'center' }}>
                      <Typography sx={{ fontWeight: 900, color: '#00E676', fontSize: '1rem' }}>
                        {m.homeScore} - {m.awayScore}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0, pl: 1, textAlign: 'right' }}>
                      <Typography sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
      </Box>

      {/* Snackbar pour copier ID */}
      <Snackbar open={copied} autoHideDuration={2000} onClose={() => setCopied(false)}>
        <Alert severity="success" sx={{ bgcolor: '#0F172A', color: '#00E676', border: '1px solid #00E676' }}>
          ID de la ligue copié dans le presse-papiers !
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LeagueDetail;
