import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  List,
  ListItem,
  Avatar,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as MatchIcon,
  Schedule as TimeIcon,
  CalendarToday as DateIcon,
  ArrowUpward as UpIcon,
  ArrowDownward as DownIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { api } from '../api';

interface MatchItem {
  id: string;
  round: number;
  startedAt: string;
  finishedAt: string;
  status: string;
  platform: string;
  homeScore: number;
  awayScore: number;
  homeTeamId: string;
  awayTeamId: string;
  homeCoachId: string | null;
  awayCoachId: string | null;
  homeTeam: { name: string; logo: string | null };
  awayTeam: { name: string; logo: string | null };
  homeCoach?: { name: string } | null;
  awayCoach?: { name: string } | null;
  homeStats?: any;
  awayStats?: any;
}

interface CompetitionDetail {
  id: string;
  name: string;
  format: string;
  status: string;
  round: number | null;
  roundsCount: number | null;
  turnDuration: number;
  timeBonusDuration: number;
  teamsMax: number | null;
  teamsCount: number | null;
  leagueId: string;
  leagueName: string;
  matchesCount: number;
  updatedAt: string;
  matches: MatchItem[];
}

interface StandingRow {
  teamId: string;
  teamName: string;
  teamLogo: string | null;
  coachId: string;
  coachName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  tdPlus: number;
  tdMinus: number;
  tdDiff: number;
  koPlus: number;
  koMinus: number;
  casPlus: number;
  casMinus: number;
  casDiff: number;
  deadPlus: number;
  deadMinus: number;
  passes: number;
  expulsions: number;
}

// Available tiebreakers configurations
interface Tiebreaker {
  id: string;
  label: string;
}

const DEFAULT_TIEBREAKERS: Tiebreaker[] = [
  { id: 'points', label: 'Points' },
  { id: 'wins', label: 'Victoires' },
  { id: 'tdDiff', label: 'Diff. TD' },
  { id: 'casDiff', label: 'Diff. Blessures' },
  { id: 'tdPlus', label: 'TD Inscrits' },
];

export const Competitions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [compDetail, setCompDetail] = useState<CompetitionDetail | null>(null);
  const [compStats, setCompStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);

  // Tiebreaker state (loaded from localStorage)
  const [tiebreakers, setTiebreakers] = useState<Tiebreaker[]>(() => {
    const saved = localStorage.getItem('sneakyskink_tiebreakers_order');
    if (saved) {
      try {
        const idsOrder = JSON.parse(saved) as string[];
        // Map back to Tiebreaker objects in that order
        return idsOrder
          .map(id => DEFAULT_TIEBREAKERS.find(t => t.id === id))
          .filter((t): t is Tiebreaker => !!t);
      } catch (e) {
        return DEFAULT_TIEBREAKERS;
      }
    }
    return DEFAULT_TIEBREAKERS;
  });

  useEffect(() => {
    if (!id) return;

    const fetchCompetitionData = async () => {
      try {
        setLoading(true);
        const [detailData, statsData] = await Promise.all([
          api.getCompetition(id),
          api.getCompetitionStats(id),
        ]);

        setCompDetail((detailData as any).data);
        setCompStats((statsData as any).data);
      } catch (err) {
        console.error('Failed to load competition details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionData();
  }, [id]);

  // Persist tiebreakers when they change
  useEffect(() => {
    const ids = tiebreakers.map(t => t.id);
    localStorage.setItem('sneakyskink_tiebreakers_order', JSON.stringify(ids));
  }, [tiebreakers]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  if (!compDetail) {
    return (
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h5" color="error" sx={{ fontWeight: 800 }}>
          Compétition introuvable
        </Typography>
        <Button onClick={() => navigate('/leagues')} sx={{ mt: 2 }} variant="contained">
          Retour aux Ligues
        </Button>
      </Box>
    );
  }

  const perf = compStats?.performance || {};
  const statsSummary = compStats?.summary || {};

  // Group matches by round
  const matchesByRound: Record<number, MatchItem[]> = {};
  if (compDetail.matches) {
    compDetail.matches.forEach((match) => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
    });
  }

  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);

  // 📐 STANDINGS CALCULATOR
  const calculateStandings = (): StandingRow[] => {
    const standingMap: Record<string, StandingRow> = {};

    const getOrCreateStanding = (teamId: string, teamName: string, teamLogo: string | null, coachId: string, coachName: string) => {
      if (!standingMap[teamId]) {
        standingMap[teamId] = {
          teamId,
          teamName,
          teamLogo,
          coachId,
          coachName,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          points: 0,
          tdPlus: 0,
          tdMinus: 0,
          tdDiff: 0,
          koPlus: 0,
          koMinus: 0,
          casPlus: 0,
          casMinus: 0,
          casDiff: 0,
          deadPlus: 0,
          deadMinus: 0,
          passes: 0,
          expulsions: 0,
        };
      }
      return standingMap[teamId];
    };

    if (compDetail.matches) {
      compDetail.matches.forEach((match) => {
        // Only include played/validated matches
        if (match.status !== 'PLAYED' && match.status !== 'VALIDATED') return;

        const homeName = match.homeTeam?.name || 'Inconnue';
        const awayName = match.awayTeam?.name || 'Inconnue';
        
        // Coach details
        const homeCoachName = match.homeCoach?.name || 'Coach Inconnu';
        const awayCoachName = match.awayCoach?.name || 'Coach Inconnu';

        const home = getOrCreateStanding(
          match.homeTeamId,
          homeName,
          match.homeTeam?.logo,
          match.homeCoachId || '',
          homeCoachName
        );
        const away = getOrCreateStanding(
          match.awayTeamId,
          awayName,
          match.awayTeam?.logo,
          match.awayCoachId || '',
          awayCoachName
        );

        home.played++;
        away.played++;

        // TDs
        home.tdPlus += match.homeScore;
        home.tdMinus += match.awayScore;
        away.tdPlus += match.awayScore;
        away.tdMinus += match.homeScore;

        // Results
        if (match.homeScore > match.awayScore) {
          home.wins++;
          home.points += 3;
          away.losses++;
        } else if (match.homeScore === match.awayScore) {
          home.draws++;
          home.points += 1;
          away.draws++;
          away.points += 1;
        } else {
          away.wins++;
          away.points += 3;
          home.losses++;
        }

        // Parse detailed statistics if available from Cyanide raw stats
        const hs = match.homeStats || {};
        const as = match.awayStats || {};

        // KOs
        home.koPlus += hs.inflictedko || 0;
        home.koMinus += as.inflictedko || 0;
        away.koPlus += as.inflictedko || 0;
        away.koMinus += hs.inflictedko || 0;

        // Casualties
        home.casPlus += hs.inflictedcasualties || 0;
        home.casMinus += as.inflictedcasualties || 0;
        away.casPlus += as.inflictedcasualties || 0;
        away.casMinus += hs.inflictedcasualties || 0;

        // Dead
        home.deadPlus += hs.deadinflicted || 0;
        home.deadMinus += as.deadinflicted || 0;
        away.deadPlus += as.deadinflicted || 0;
        away.deadMinus += hs.deadinflicted || 0;

        // Passes
        home.passes += hs.passes || 0;
        away.passes += as.passes || 0;

        // Expulsions (sustainedexpulsions or expulsions)
        home.expulsions += hs.sustainedexpulsions || hs.expulsions || 0;
        away.expulsions += as.sustainedexpulsions || as.expulsions || 0;
      });
    }

    // Post-calculate differentials
    Object.values(standingMap).forEach(row => {
      row.tdDiff = row.tdPlus - row.tdMinus;
      row.casDiff = row.casPlus - row.casMinus;
    });

    // Dynamic tiebreakers sort
    return Object.values(standingMap).sort((a, b) => {
      for (const t of tiebreakers) {
        const valA = a[t.id as keyof StandingRow] as number;
        const valB = b[t.id as keyof StandingRow] as number;
        if (valA !== valB) {
          return valB - valA; // Descending order
        }
      }
      // Ultimate fallback: alphabetical team name
      return a.teamName.localeCompare(b.teamName);
    });
  };

  const standings = calculateStandings();

  // Move tiebreaker up in priority
  const moveUp = (index: number) => {
    if (index === 0) return;
    const copy = [...tiebreakers];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    setTiebreakers(copy);
  };

  // Move tiebreaker down in priority
  const moveDown = (index: number) => {
    if (index === tiebreakers.length - 1) return;
    const copy = [...tiebreakers];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    setTiebreakers(copy);
  };

  // Bracket view rendering helper
  const isBracketFormat = 
    compDetail.format.toLowerCase().includes('knockout') ||
    compDetail.format.toLowerCase().includes('bracket') ||
    compDetail.format.toLowerCase().includes('playoff') ||
    compDetail.format.toLowerCase().includes('elimination');

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Back Button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(`/leagues/${compDetail.leagueId}`)}
        sx={{ mb: 3, fontWeight: 700, color: '#94A3B8', '&:hover': { color: '#00E676' } }}
      >
        Retour à la Ligue
      </Button>

      {/* Header Info */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          borderLeft: '4px solid #00E676 !important',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              🏆 {compDetail.leagueName}
            </Typography>
            <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mt: 0.5, mb: 1.5, color: '#F8FAFC' }}>
              {compDetail.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip label={compDetail.format} sx={{ fontWeight: 800, bgcolor: 'rgba(255,255,255,0.04)' }} />
              <Chip
                label={compDetail.status}
                color={compDetail.status.toLowerCase() === 'inprogress' || compDetail.status.toLowerCase() === 'running' ? 'warning' : 'success'}
                sx={{ fontWeight: 800 }}
              />
              <Chip label={`${compDetail.teamsCount || 0} / ${compDetail.teamsMax || 0} Équipes`} variant="outlined" sx={{ fontWeight: 800 }} />
            </Box>
          </Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="body2" sx={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <DateIcon fontSize="small" /> Mise à jour : {new Date(compDetail.updatedAt).toLocaleDateString()}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1, display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
              <TimeIcon fontSize="small" /> Tours de {Math.round(compDetail.turnDuration / 60)} minutes
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 4 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Classement (Standings)" sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
          <Tab label="Matchs & Journées" sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
          <Tab label="Tableau Final (Bracket)" sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
          <Tab label="Statistiques Globales" sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
        </Tabs>
      </Box>

      {/* 🏆 TAB 0: Standings (Round-Robin/Swiss) */}
      {tabValue === 0 && (
        <Box>
          {standings.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucun match joué dans cette compétition pour le moment. Le classement apparaîtra après le premier match validé.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={4}>
              
              {/* Leaderboard Table */}
              <Grid item xs={12} xl={9.5}>
                <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: '#151D30' }}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell align="center" sx={{ width: 60, fontWeight: 800 }}>RANG</TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>ÉQUIPE / COACH</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>PTS</TableCell>
                        <TableCell align="center" sx={{ color: '#94A3B8' }}>J</TableCell>
                        <TableCell align="center" sx={{ color: '#00E676' }}>V</TableCell>
                        <TableCell align="center" sx={{ color: '#64748B' }}>N</TableCell>
                        <TableCell align="center" sx={{ color: '#EF4444' }}>D</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>TD+</TableCell>
                        <TableCell align="center" sx={{ color: '#64748B' }}>TD-</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>DIFF</TableCell>
                        <TableCell align="center">CAS+</TableCell>
                        <TableCell align="center" sx={{ color: '#64748B' }}>CAS-</TableCell>
                        <TableCell align="center">KO+</TableCell>
                        <TableCell align="center">MORTS</TableCell>
                        <TableCell align="center">PASSES</TableCell>
                        <TableCell align="center" sx={{ color: '#EF4444' }}>EXP</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {standings.map((row, index) => (
                        <TableRow key={row.teamId} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.02) !important' } }}>
                          <TableCell align="center" sx={{ fontWeight: 900, fontFamily: 'Outfit', fontSize: '1.1rem', color: index < 3 ? '#00E676' : '#94A3B8' }}>
                            {index + 1}
                          </TableCell>
                          
                          {/* Team Name / Coach Link */}
                          <TableCell sx={{ py: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar src={row.teamLogo || undefined} sx={{ width: 34, height: 34, bgcolor: '#0B0F19' }}>🏈</Avatar>
                              <Box>
                                <Typography 
                                  variant="subtitle2" 
                                  onClick={() => navigate(`/teams/${row.teamId}`)}
                                  sx={{ 
                                    fontWeight: 800, 
                                    color: '#F8FAFC', 
                                    cursor: 'pointer', 
                                    '&:hover': { color: '#00E676', textDecoration: 'underline' } 
                                  }}
                                >
                                  {row.teamName}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  onClick={() => navigate(`/coaches/${row.coachId}`)}
                                  sx={{ 
                                    color: '#64748B', 
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    '&:hover': { color: '#38BDF8' }
                                  }}
                                >
                                  {row.coachName}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell align="center" sx={{ fontWeight: 900, fontFamily: 'Outfit', color: '#00E676', fontSize: '1.1rem' }}>{row.points}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{row.played}</TableCell>
                          <TableCell align="center" sx={{ color: '#00E676', fontWeight: 700 }}>{row.wins}</TableCell>
                          <TableCell align="center" sx={{ color: '#64748B' }}>{row.draws}</TableCell>
                          <TableCell align="center" sx={{ color: '#EF4444' }}>{row.losses}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>{row.tdPlus}</TableCell>
                          <TableCell align="center" sx={{ color: '#64748B' }}>{row.tdMinus}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: row.tdDiff > 0 ? '#00E676' : row.tdDiff < 0 ? '#EF4444' : '#94A3B8' }}>
                            {row.tdDiff > 0 ? `+${row.tdDiff}` : row.tdDiff}
                          </TableCell>
                          <TableCell align="center" sx={{ color: '#E11D48', fontWeight: 700 }}>{row.casPlus}</TableCell>
                          <TableCell align="center" sx={{ color: '#64748B' }}>{row.casMinus}</TableCell>
                          <TableCell align="center">{row.koPlus}</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800, color: row.deadPlus > 0 ? '#EF4444' : '#64748B' }}>{row.deadPlus}</TableCell>
                          <TableCell align="center" sx={{ color: '#38BDF8' }}>{row.passes}</TableCell>
                          <TableCell align="center" sx={{ color: '#EF4444' }}>{row.expulsions}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* ⚙️ Tiebreakers Configurator panel */}
              <Grid item xs={12} xl={2.5}>
                <Card sx={{ p: 3, borderRadius: 4, border: '1px solid rgba(0, 230, 118, 0.15) !important' }}>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 1.5, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚙️ Règles de Départage
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 3 }}>
                    Modifiez la priorité des critères de départage. Les changements sont appliqués en temps réel et enregistrés localement.
                  </Typography>

                  <List sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 0 }}>
                    {tiebreakers.map((t, index) => (
                      <ListItem 
                        key={t.id} 
                        sx={{ 
                          bgcolor: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: 3.5, 
                          px: 2, 
                          py: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 900, color: '#00E676', fontFamily: 'Outfit' }}>
                            #{index + 1}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {t.label}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton 
                            size="small" 
                            disabled={index === 0} 
                            onClick={() => moveUp(index)}
                            sx={{ color: '#38BDF8', p: 0.5 }}
                          >
                            <UpIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            disabled={index === tiebreakers.length - 1} 
                            onClick={() => moveDown(index)}
                            sx={{ color: '#38BDF8', p: 0.5 }}
                          >
                            <DownIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Card>
              </Grid>

            </Grid>
          )}
        </Box>
      )}

      {/* 📅 TAB 1: Matches List */}
      {tabValue === 1 && (
        <Box>
          {sortedRounds.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="h6" sx={{ color: '#94A3B8' }}>
                Aucun match enregistré
              </Typography>
            </Paper>
          ) : (
            sortedRounds.map((roundNum) => (
              <Box key={roundNum} sx={{ mb: 5 }}>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC', mb: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  📅 Journée {roundNum}
                </Typography>
                <Grid container spacing={3.5}>
                  {matchesByRound[roundNum].map((match) => (
                    <Grid item xs={12} md={6} key={match.id}>
                      <Card
                        className="hover-scale"
                        onClick={() => navigate(`/matches/${match.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          {/* Top row */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                              {new Date(match.startedAt).toLocaleString()}
                            </Typography>
                            <Chip
                              label={match.status}
                              size="small"
                              color={match.status === 'PLAYED' || match.status === 'VALIDATED' ? 'success' : 'default'}
                              sx={{ fontWeight: 800, fontSize: '0.65rem', height: 18 }}
                            />
                          </Box>

                          {/* Head-to-Head */}
                          <Grid container alignItems="center" spacing={1}>
                            <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar src={match.homeTeam.logo || undefined} alt={match.homeTeam.name} sx={{ width: 38, height: 38, bgcolor: '#0B0F19' }}>🏈</Avatar>
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {match.homeTeam.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                  {match.homeCoach?.name || 'Coach Inconnu'}
                                </Typography>
                              </Box>
                            </Grid>

                            <Grid item xs={2} sx={{ textAlign: 'center' }}>
                              <Paper sx={{ py: 0.5, px: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2, display: 'inline-block' }}>
                                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900, lineHeight: 1 }}>
                                  {match.homeScore} - {match.awayScore}
                                </Typography>
                              </Paper>
                            </Grid>

                            <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end', textAlign: 'right' }}>
                              <Box sx={{ overflow: 'hidden' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {match.awayTeam.name}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                  {match.awayCoach?.name || 'Coach Inconnu'}
                                </Typography>
                              </Box>
                              <Avatar src={match.awayTeam.logo || undefined} alt={match.awayTeam.name} sx={{ width: 38, height: 38, bgcolor: '#0B0F19' }}>🏈</Avatar>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            ))
          )}
        </Box>
      )}

      {/* 🌿 TAB 2: Visual Tournament Bracket */}
      {tabValue === 2 && (
        <Box sx={{ animation: 'fadeIn 0.3s ease-in-out', overflowX: 'auto', py: 2 }}>
          {sortedRounds.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucun match pour générer l'arbre des brackets.
              </Typography>
            </Paper>
          ) : (
            <Box sx={{ display: 'flex', gap: 6, minWidth: '900px', p: 2 }}>
              {/* Columns representing rounds (Journées) starting from early rounds to finals */}
              {[...sortedRounds].reverse().map((roundNum) => {
                const roundMatches = matchesByRound[roundNum] || [];
                return (
                  <Box key={roundNum} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 260 }}>
                    
                    {/* Header for Round */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#00E676' }}>
                        Journée {roundNum}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                        {roundMatches.length} Matchs
                      </Typography>
                    </Box>

                    {/* Round Matches cards list */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, flexGrow: 1, justifyContent: 'center' }}>
                      {roundMatches.map((match) => (
                        <Card 
                          key={match.id} 
                          sx={{ 
                            borderRadius: 3.5, 
                            border: '1px solid rgba(148, 163, 184, 0.08) !important',
                            bgcolor: '#151D30',
                            transition: 'all 0.2s',
                            '&:hover': { border: '1px solid #00E676 !important' }
                          }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            {/* Home slot */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '160px' }}>
                                <Avatar src={match.homeTeam.logo || undefined} sx={{ width: 22, height: 22 }} />
                                <Typography 
                                  variant="body2" 
                                  noWrap 
                                  sx={{ 
                                    fontWeight: match.homeScore > match.awayScore ? 800 : 500,
                                    color: match.homeScore > match.awayScore ? '#00E676' : '#94A3B8'
                                  }}
                                >
                                  {match.homeTeam.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#F8FAFC' }}>
                                {match.homeScore}
                              </Typography>
                            </Box>

                            {/* Away slot */}
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: '160px' }}>
                                <Avatar src={match.awayTeam.logo || undefined} sx={{ width: 22, height: 22 }} />
                                <Typography 
                                  variant="body2" 
                                  noWrap 
                                  sx={{ 
                                    fontWeight: match.awayScore > match.homeScore ? 800 : 500,
                                    color: match.awayScore > match.homeScore ? '#00E676' : '#94A3B8'
                                  }}
                                >
                                  {match.awayTeam.name}
                                </Typography>
                              </Box>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: '#F8FAFC' }}>
                                {match.awayScore}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>

                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      )}

      {/* 📊 TAB 3: Global Statistics */}
      {tabValue === 3 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <Grid container spacing={4}>
            
            {/* Left summary cards */}
            <Grid item xs={12} md={3.5}>
              <Grid container spacing={2}>
                
                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 700, mb: 0.5 }}>
                      Matchs Enregistrés
                    </Typography>
                    <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#38BDF8' }}>
                      {statsSummary.totalMatches || 0}
                    </Typography>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card sx={{ p: 3, textAlign: 'center', border: '1px solid rgba(255, 61, 0, 0.15) !important' }}>
                    <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 700, mb: 0.5 }}>
                      Forfaits / Concessions
                    </Typography>
                    <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#FF3D00' }}>
                      {statsSummary.forfeits || 0}
                    </Typography>
                  </Card>
                </Grid>

              </Grid>
            </Grid>

            {/* Right Detailed Stats */}
            <Grid item xs={12} md={8.5}>
              <Card sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3, color: '#F8FAFC' }}>
                  🏈 Statistiques Cumulées de la Compétition
                </Typography>
                <Grid container spacing={3.5}>
                  
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Touchdowns Marqués</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>
                      {perf.touchdowns || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Passes Complétées</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#38BDF8' }}>
                      {perf.passes || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Yards à la course</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>
                      {perf.yardsRunning || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Blocages Réussis</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#10B981' }}>
                      {perf.blocksSucceeded || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Armures Brisées</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#E11D48' }}>
                      {perf.armourBreaks || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Plaquages Réussis</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#6366F1' }}>
                      {perf.tackles || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>KOs Infligés</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EC4899' }}>
                      {perf.koInflicted || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Blessures Causées</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EF4444' }}>
                      {perf.injuriesInflicted || 0}
                    </Typography>
                  </Grid>

                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>Morts Causées 💀</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F8FAFC' }}>
                      {perf.deadInflicted || 0}
                    </Typography>
                  </Grid>

                </Grid>
              </Card>
            </Grid>

          </Grid>
        </Box>
      )}

    </Box>
  );
};
