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
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as MatchIcon,
  Schedule as TimeIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import axios from 'axios';

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
  homeTeam: { name: string; logo: string | null };
  awayTeam: { name: string; logo: string | null };
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

export const Competitions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [compDetail, setCompDetail] = useState<CompetitionDetail | null>(null);
  const [compStats, setCompStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const fetchCompetitionData = async () => {
      try {
        setLoading(true);
        const [detailRes, statsRes] = await Promise.all([
          axios.get(`http://localhost:3001/competitions/${id}?includeMatches=true`),
          axios.get(`http://localhost:3001/stats/competition/${id}`),
        ]);

        setCompDetail(detailRes.data);
        setCompStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load competition details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionData();
  }, [id]);

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
        <Typography variant="h5" color="error">
          Compétition introuvable
        </Typography>
        <Button onClick={() => navigate('/leagues')} sx={{ mt: 2 }}>
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

  // Sort rounds descending
  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Back to League */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/leagues')}
        sx={{ mb: 3, fontWeight: 700, color: '#94A3B8' }}
      >
        Retour à la Ligue
      </Button>

      {/* Header card */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          borderLeft: '4px solid #38BDF8 !important',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, textTransform: 'uppercase', tracking: '0.1em' }}>
              🏆 {compDetail.leagueName}
            </Typography>
            <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mt: 0.5, mb: 1.5 }}>
              {compDetail.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Chip label={compDetail.format} sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.04)' }} />
              <Chip
                label={compDetail.status}
                color={compDetail.status === 'InProgress' ? 'warning' : compDetail.status === 'Played' || compDetail.status === 'Validated' ? 'success' : 'default'}
                sx={{ fontWeight: 700 }}
              />
              <Chip label={`${compDetail.teamsCount || 0} / ${compDetail.teamsMax || 0} Équipes`} variant="outlined" sx={{ fontWeight: 700 }} />
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
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Matchs de la Compétition" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label="Statistiques de la Phase" sx={{ fontWeight: 700, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* Tab 0: Matches List */}
      {tabValue === 0 && (
        <Box>
          {sortedRounds.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
              <Typography variant="h6" sx={{ color: '#94A3B8' }}>
                Aucun match enregistré
              </Typography>
            </Paper>
          ) : (
            sortedRounds.map((roundNum) => (
              <Box key={roundNum} sx={{ mb: 4 }}>
                <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F8FAFC', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  📅 Round / Journée {roundNum}
                </Typography>
                <Grid container spacing={2}>
                  {matchesByRound[roundNum].map((match) => (
                    <Grid item xs={12} md={6} key={match.id}>
                      <Card
                        className="hover-scale"
                        onClick={() => navigate(`/matches/${match.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
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

                          {/* Head-to-Head Scores */}
                          <Grid container alignItems="center" spacing={1}>
                            {/* Home Team */}
                            <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                src={match.homeTeam.logo || undefined}
                                alt={match.homeTeam.name}
                                sx={{ width: 36, height: 36, bgcolor: '#0B0F19' }}
                              >
                                🏈
                              </Avatar>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {match.homeTeam.name}
                              </Typography>
                            </Grid>

                            {/* Score banner */}
                            <Grid item xs={2} sx={{ textAlign: 'center' }}>
                              <Paper
                                sx={{
                                  py: 0.5,
                                  px: 1,
                                  bgcolor: 'rgba(255,255,255,0.03)',
                                  border: '1px solid rgba(255,255,255,0.05)',
                                  borderRadius: 2,
                                  display: 'inline-block',
                                }}
                              >
                                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900, lineHeight: 1 }}>
                                  {match.homeScore} - {match.awayScore}
                                </Typography>
                              </Paper>
                            </Grid>

                            {/* Away Team */}
                            <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-end', textAlign: 'right' }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {match.awayTeam.name}
                              </Typography>
                              <Avatar
                                src={match.awayTeam.logo || undefined}
                                alt={match.awayTeam.name}
                                sx={{ width: 36, height: 36, bgcolor: '#0B0F19' }}
                              >
                                🏈
                              </Avatar>
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

      {/* Tab 1: Phase Statistics */}
      {tabValue === 1 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <Grid container spacing={4}>
            {/* General summary */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1 }}>
                    Matchs Enregistrés
                  </Typography>
                  <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#38BDF8' }}>
                    {statsSummary.totalMatches || 0}
                  </Typography>
                  <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 600, mt: 3, mb: 1 }}>
                    Forfaits / Concessions
                  </Typography>
                  <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#FF3D00' }}>
                    {statsSummary.forfeits || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Highlights Grid */}
            <Grid item xs={12} sm={6} md={9}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2 }}>
                    🏈 Statistiques Cumulées de la Phase
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Touchdowns marqués</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>{perf.touchdowns || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Passes complétées</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#38BDF8' }}>{perf.passes || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Yards à la course</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>{perf.yardsRunning || 0}</Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Blocages réussis</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#10B981' }}>{perf.blocksSucceeded || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Armures brisées</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#E11D48' }}>{perf.armourBreaks || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Plaquages réussis</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#6366F1' }}>{perf.tackles || 0}</Typography>
                    </Grid>

                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>KOs Infligés</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EC4899' }}>{perf.koInflicted || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Blessures causées</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#EF4444' }}>{perf.injuriesInflicted || 0}</Typography>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>Morts Causées 💀</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#1E293B' }}>{perf.deadInflicted || 0}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
};
