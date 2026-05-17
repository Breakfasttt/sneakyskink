import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  CardActionArea,
  Avatar,
  Tab,
  Tabs,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  ChevronLeft as BackIcon,
  SportsEsports as MatchIcon,
  Layers as CompIcon,
  People as TeamIcon,
  Info as InfoIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface LeagueItem {
  id: string;
  name: string;
  logo: string | null;
  gamerCount: number | null;
  active: boolean;
  competitionsCount: number;
  matchesCount: number;
  updatedAt: string;
}

interface CompetitionItem {
  id: string;
  name: string;
  format: string;
  status: string;
  round: number | null;
  roundsCount: number | null;
  teamsMax: number | null;
  teamsCount: number | null;
}

interface LeagueDetail extends LeagueItem {
  competitions: CompetitionItem[];
}

export const Leagues: React.FC = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<LeagueItem[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
  const [leagueDetail, setLeagueDetail] = useState<LeagueDetail | null>(null);
  const [leagueStats, setLeagueStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [tabValue, setTabValue] = useState<number>(0);

  // Fetch all leagues on mount
  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        setLoading(true);
        const res = await axios.get('http://localhost:3001/leagues');
        setLeagues(res.data.data || []);
      } catch (err) {
        console.error('Failed to load leagues', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, []);

  // Fetch league details when one is clicked
  useEffect(() => {
    if (!selectedLeagueId) return;

    const fetchLeagueDetails = async () => {
      try {
        setDetailLoading(true);
        setTabValue(0); // Reset to competitions tab
        
        const [detailRes, statsRes] = await Promise.all([
          axios.get(`http://localhost:3001/leagues/${selectedLeagueId}?includeCompetitions=true`),
          axios.get(`http://localhost:3001/stats/league/${selectedLeagueId}`),
        ]);

        setLeagueDetail(detailRes.data);
        setLeagueStats(statsRes.data);
      } catch (err) {
        console.error('Failed to load league details', err);
      } finally {
        setDetailLoading(false);
      }
    };

    fetchLeagueDetails();
  }, [selectedLeagueId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  // Render detail view
  if (selectedLeagueId && leagueDetail) {
    const perf = leagueStats?.performance || {};
    const statsSummary = leagueStats?.summary || {};

    return (
      <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
        {/* Back Button */}
        <Button
          startIcon={<BackIcon />}
          onClick={() => {
            setSelectedLeagueId(null);
            setLeagueDetail(null);
            setLeagueStats(null);
          }}
          sx={{ mb: 3, fontWeight: 700, color: '#94A3B8' }}
        >
          Retour aux Ligues
        </Button>

        {/* League Detail Header Banner */}
        <Paper
          className="glass-panel"
          sx={{
            p: 4,
            mb: 4,
            borderRadius: 4,
            borderLeft: '4px solid #00E676 !important',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Avatar
                src={leagueDetail.logo || undefined}
                alt={leagueDetail.name}
                sx={{
                  width: 96,
                  height: 96,
                  bgcolor: '#0B0F19',
                  border: '2px solid rgba(0, 230, 118, 0.3)',
                  boxShadow: '0 0 16px rgba(0,230,118,0.1)',
                }}
              >
                <TrophyIcon style={{ fontSize: 48, color: '#00E676' }} />
              </Avatar>
            </Grid>
            <Grid item xs={12} sm={10} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900 }}>
                  {leagueDetail.name}
                </Typography>
                <Chip
                  label={leagueDetail.active ? 'Active' : 'Archivée'}
                  color={leagueDetail.active ? 'success' : 'default'}
                  sx={{ fontWeight: 700 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1, display: 'flex', alignItems: 'center', gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <DateIcon fontSize="small" /> Mise à jour : {new Date(leagueDetail.updatedAt).toLocaleString()}
              </Typography>

              {/* Stats badges */}
              <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#00E676' }}>
                    {leagueDetail.competitionsCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    Compétitions
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                <Box>
                  <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#38BDF8' }}>
                    {leagueDetail.matchesCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                    Matchs Joués
                  </Typography>
                </Box>
                {leagueDetail.gamerCount && (
                  <>
                    <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.08)' }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontFamily: 'Outfit', fontWeight: 800, color: '#F59E0B' }}>
                        {leagueDetail.gamerCount}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                        Inscrits
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Tab Selection */}
        <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
            <Tab label="Compétitions" sx={{ fontWeight: 700, fontSize: '1rem' }} />
            <Tab label="Dashboard Ligue" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          </Tabs>
        </Box>

        {detailLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <>
            {/* Tab 0: Competitions */}
            {tabValue === 0 && (
              <Grid container spacing={3}>
                {leagueDetail.competitions.length === 0 ? (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
                      <Typography variant="h6" sx={{ color: '#94A3B8', mb: 1 }}>
                        Aucune compétition trouvée
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748B' }}>
                        Cette ligue ne contient aucun tournoi ou bracket enregistré.
                      </Typography>
                    </Paper>
                  </Grid>
                ) : (
                  leagueDetail.competitions.map((comp) => (
                    <Grid item xs={12} sm={6} md={4} key={comp.id}>
                      <Card
                        className="hover-scale"
                        onClick={() => navigate(`/competitions/${comp.id}`)}
                        style={{ cursor: 'pointer', height: '100%' }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5, alignItems: 'flex-start' }}>
                            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, pr: 2 }}>
                              {comp.name}
                            </Typography>
                            <Chip
                              label={comp.status}
                              size="small"
                              color={comp.status === 'InProgress' ? 'warning' : comp.status === 'Played' || comp.status === 'Validated' ? 'success' : 'default'}
                              sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                            />
                          </Box>
                          <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                Format
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {comp.format}
                              </Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                Round / Journée
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {comp.round || 1} sur {comp.roundsCount || '?'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} sx={{ mt: 1 }}>
                              <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                                Équipes enregistrées
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#00E676' }}>
                                {comp.teamsCount || 0} / {comp.teamsMax || 0} max
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                )}
              </Grid>
            )}

            {/* Tab 1: Stats Dashboard */}
            {tabValue === 1 && (
              <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
                <Grid container spacing={4}>
                  {/* General summary */}
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent sx={{ textAlign: 'center', p: 3 }}>
                        <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 600, mb: 1 }}>
                          Taux de Concession
                        </Typography>
                        <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#FF3D00' }}>
                          {statsSummary.totalMatches > 0 ? ((statsSummary.forfeits / statsSummary.totalMatches) * 100).toFixed(1) : 0}%
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 1 }}>
                          {statsSummary.forfeits} forfaits sur {statsSummary.totalMatches} matchs.
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Highlights Grid */}
                  <Grid item xs={12} sm={6} md={9}>
                    <Card>
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2 }}>
                          🏟️ Statistiques Cumulées de la Ligue
                        </Typography>
                        <Grid container spacing={3}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Touchdowns</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#00E676' }}>{perf.touchdowns || 0}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Passes complétées</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#38BDF8' }}>{perf.passes || 0}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Blocages réussis</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F59E0B' }}>{perf.blocksSucceeded || 0}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Armures brisées</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#E11D48' }}>{perf.armourBreaks || 0}</Typography>
                          </Grid>

                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>KOs Infligés</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#F43F5E' }}>{perf.koInflicted || 0}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Blessures graves</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#BE123C' }}>{perf.injuriesInflicted || 0}</Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>Joueurs décédés 💀</Typography>
                            <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit', color: '#111827' }}>{perf.deadInflicted || 0}</Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
          </>
        )}
      </Box>
    );
  }

  // Render leagues list
  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, mb: 1 }}>
        🏆 Ligues Blood Bowl 3
      </Typography>
      <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
        Parcourez et examinez les statistiques générales de la ligue officielle ou des tournois communautaires.
      </Typography>

      <Grid container spacing={3}>
        {leagues.map((league) => (
          <Grid item xs={12} sm={6} md={4} key={league.id}>
            <Card className="hover-scale" style={{ height: '100%' }}>
              <CardActionArea onClick={() => setSelectedLeagueId(league.id)} style={{ height: '100%', display: 'flex', alignItems: 'stretch' }}>
                <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%' }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar
                        src={league.logo || undefined}
                        alt={league.name}
                        sx={{ bgcolor: '#0B0F19', border: '1px solid rgba(0, 230, 118, 0.15)', width: 48, height: 48 }}
                      >
                        <TrophyIcon style={{ color: '#00E676' }} />
                      </Avatar>
                      <Box>
                        <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, lineHeight: 1.2 }}>
                          {league.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>
                          Mise à jour : {new Date(league.updatedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                      <Chip
                        label={league.active ? 'Active' : 'Archivée'}
                        size="small"
                        color={league.active ? 'success' : 'default'}
                        sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                      />
                      {league.gamerCount && (
                        <Chip
                          icon={<TeamIcon style={{ fontSize: '0.8rem' }} />}
                          label={`${league.gamerCount} coachs`}
                          size="small"
                          sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, bgcolor: 'rgba(255,255,255,0.03)' }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5, bgcolor: 'rgba(255,255,255,0.04)' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#38BDF8' }}>
                      <CompIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {league.competitionsCount} compétitions
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#00E676' }}>
                      <MatchIcon fontSize="small" />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {league.matchesCount} matchs
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
