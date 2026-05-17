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
  Tab,
  Tabs,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CardActionArea,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as MatchIcon,
  People as CoachIcon,
  MonetizationOn as CashIcon,
  AddModerator as ShieldIcon,
  RotateRight as RerollIcon,
  Group as FansIcon,
  AddBusiness as CheerIcon,
  SupportAgent as StaffIcon,
  HeartBroken as InjuredIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

interface PlayerItem {
  id: string;
  name: string | null;
  number: number;
  type: string;
  status: string;
  value: number;
  level: number;
  xp: number;
  ma: number;
  st: number;
  ag: number;
  pa: number;
  av: number;
  innateSkills: string[];
  acquiredSkills: string[];
  activeCasualties: string[];
  stats?: Array<{
    matchPlayed: boolean;
    touchdowns: number;
    passes: number;
    catches: number;
    interceptions: number;
    blocksSucceeded: number;
    casualtiesInflicted: number;
    koInflicted: number;
    mvp: boolean;
  }>;
}

interface TeamProfile {
  id: string;
  name: string;
  raceId: number;
  logo: string | null;
  value: number;
  cash: number;
  cheerleaders: number;
  assistantCoaches: number;
  popularity: number;
  rerolls: number;
  apothecary: boolean;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  coachId: string;
  coachName: string;
  coachCountry: string | null;
  playersCount: number;
  matchesCount: number;
  players: PlayerItem[];
}

export const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [team, setTeam] = useState<TeamProfile | null>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const fetchTeamData = async () => {
      try {
        setLoading(true);
        const [teamRes, matchesRes] = await Promise.all([
          api.getTeam(id),
          api.getMatches({ teamId: id } as any),
        ]);

        setTeam((teamRes as any).data);
        setMatches((matchesRes as any).data || []);
      } catch (err) {
        console.error('Failed to load team details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamData();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  if (!team) {
    return (
      <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4, maxWidth: '600px', mx: 'auto', mt: 4 }}>
        <Typography variant="h5" sx={{ color: '#EF4444', mb: 2, fontWeight: 700 }}>
          Équipe Introuvable
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8', mb: 4 }}>
          L'équipe demandée n'existe pas ou n'est pas encore enregistrée.
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/')} startIcon={<BackIcon />}>
          Retour à l'accueil
        </Button>
      </Paper>
    );
  }

  const rInfo = getRaceInfo(team.raceId);

  // Helper to format attributes
  const formatAgPa = (val: number) => {
    if (val === 0 || !val) return '-';
    return `${val}+`;
  };

  const formatAv = (val: number) => {
    if (val === 0 || !val) return '-';
    return `${val}+`;
  };

  // Helper to calculate a player's career stats
  const computeCareerStats = (playerStats?: any[]) => {
    let played = 0;
    let touchdowns = 0;
    let passes = 0;
    let interceptions = 0;
    let casualties = 0;
    let mvps = 0;

    if (playerStats) {
      playerStats.forEach((s) => {
        if (s.matchPlayed) played++;
        touchdowns += s.touchdowns || 0;
        passes += s.passes || 0;
        interceptions += s.interceptions || 0;
        casualties += s.casualtiesInflicted || 0;
        if (s.mvp) mvps++;
      });
    }

    return { played, touchdowns, passes, interceptions, casualties, mvps };
  };

  return (
    <Box sx={{ maxWidth: '1200px', mx: 'auto', p: 1, animation: 'fadeIn 0.3s ease-in-out' }}>
      
      {/* Back Button */}
      <Button 
        variant="text" 
        onClick={() => navigate('/')} 
        startIcon={<BackIcon />} 
        sx={{ color: '#94A3B8', mb: 3, '&:hover': { color: '#00E676' } }}
      >
        Retour au Dashboard
      </Button>

      {/* 👑 Team Profile Header Card */}
      <Card sx={{ p: 4, borderRadius: 5, mb: 4 }}>
        <Grid container spacing={4} alignItems="center">
          
          {/* Logo, Name & Coach */}
          <Grid item xs={12} md={7} sx={{ display: 'flex', alignItems: 'center', gap: 3.5 }}>
            <Avatar 
              src={team.logo || undefined} 
              sx={{ 
                width: 90, 
                height: 90, 
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '2px solid rgba(0, 230, 118, 0.4)',
                boxShadow: '0 0 20px rgba(0, 230, 118, 0.15)'
              }}
            >
              🏈
            </Avatar>
            <Box>
              <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC', mb: 0.5, lineHeight: 1.1 }}>
                {team.name}
              </Typography>
              <Typography 
                variant="subtitle1" 
                onClick={() => navigate(`/coaches/${team.coachId}`)}
                sx={{ 
                  color: '#64748B', 
                  fontWeight: 700, 
                  mb: 1.5,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  '&:hover': { color: '#00E676', textDecoration: 'underline' }
                }}
              >
                <CoachIcon fontSize="small" /> Coach : {team.coachName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label={rInfo.name} color="primary" sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem' }} />
                <Chip 
                  label={`${team.wins}V - ${team.draws}N - ${team.losses}D`} 
                  variant="outlined" 
                  sx={{ fontWeight: 800, height: 24, fontSize: '0.7rem' }} 
                />
              </Box>
            </Box>
          </Grid>

          {/* Quick specs grid (Treasury, Rerolls, Apothecary) */}
          <Grid item xs={12} md={5}>
            <Grid container spacing={1.5}>
              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>VALEUR (TV)</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#00E676' }}>
                    {(team.value / 1000).toFixed(0)}k TV
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>TRÉSORERIE</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#38BDF8' }}>
                    {(team.cash / 1000).toFixed(0)}k GP
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>RELANCES</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC' }}>
                    {team.rerolls}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>POPULAIRITÉ</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F59E0B' }}>
                    {team.popularity}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>POM-POMS</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#F8FAFC' }}>
                    {team.cheerleaders}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={6} sm={4}>
                <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, display: 'block' }}>APOTHÉCAIRE</Typography>
                  <Typography variant="subtitle1" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: team.apothecary ? '#00E676' : '#EF4444' }}>
                    {team.apothecary ? 'OUI' : 'NON'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

        </Grid>
      </Card>

      {/* Tabs list (Roster / Matches) */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label={`Effectif d'Équipe (Roster)`} sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
          <Tab label={`Matchs Joués (${matches.length})`} sx={{ fontWeight: 800, fontSize: '0.95rem' }} />
        </Tabs>
      </Box>

      {/* TAB 0: Nuffle-style Roster Table */}
      {tabValue === 0 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {(!team.players || team.players.length === 0) ? (
            <Paper className="glass-panel" sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucun joueur actif enregistré dans l'effectif pour le moment.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ borderRadius: 4, bgcolor: '#151D30' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
                    <TableCell align="center" sx={{ fontWeight: 800, py: 1.5 }}>N°</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>NOM DU JOUEUR</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>POSTE</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>NIV</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>XP</TableCell>
                    {/* Attributes */}
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>MA</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>ST</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>AG</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>PA</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#38BDF8' }}>AV</TableCell>
                    {/* Skills */}
                    <TableCell sx={{ fontWeight: 800 }}>COMPÉTENCES INNÉES</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>COMPÉTENCES ACQUISES</TableCell>
                    {/* Casualties */}
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#EF4444' }}>BLESSURES</TableCell>
                    {/* Career Stats */}
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>M</TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>TD</TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>PAS</TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>INT</TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>CAS</TableCell>
                    <TableCell align="center" sx={{ color: '#64748B', fontWeight: 700 }}>MVP</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.players.map((player) => {
                    const c = computeCareerStats(player.stats);
                    return (
                      <TableRow key={player.id} hover sx={{ '&:hover': { bgcolor: 'rgba(255,255,255,0.015) !important' } }}>
                        {/* Number */}
                        <TableCell align="center" sx={{ fontWeight: 900, fontFamily: 'Outfit', fontSize: '1rem', color: '#00E676' }}>
                          {player.number}
                        </TableCell>
                        
                        {/* Name */}
                        <TableCell sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                          {player.name || `Joueur #${player.number}`}
                        </TableCell>
                        
                        {/* Type / Position */}
                        <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>
                          {player.type}
                        </TableCell>
                        
                        {/* Level */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {player.level}
                        </TableCell>
                        
                        {/* XP */}
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {player.xp}
                        </TableCell>

                        {/* MA */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {player.ma}
                        </TableCell>

                        {/* ST */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {player.st}
                        </TableCell>

                        {/* AG */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {formatAgPa(player.ag)}
                        </TableCell>

                        {/* PA */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {formatAgPa(player.pa)}
                        </TableCell>

                        {/* AV */}
                        <TableCell align="center" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>
                          {formatAv(player.av)}
                        </TableCell>

                        {/* Innate Skills */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(!player.innateSkills || player.innateSkills.length === 0) ? (
                              <Typography variant="caption" sx={{ color: '#64748B' }}>-</Typography>
                            ) : (
                              player.innateSkills.map((sk) => (
                                <Chip key={sk} label={sk} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(255,255,255,0.03)' }} />
                              ))
                            )}
                          </Box>
                        </TableCell>

                        {/* Acquired Skills */}
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {(!player.acquiredSkills || player.acquiredSkills.length === 0) ? (
                              <Typography variant="caption" sx={{ color: '#64748B' }}>-</Typography>
                            ) : (
                              player.acquiredSkills.map((sk) => (
                                <Chip key={sk} label={sk} size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />
                              ))
                            )}
                          </Box>
                        </TableCell>

                        {/* Casualties / Injuries */}
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
                            {(!player.activeCasualties || player.activeCasualties.length === 0) ? (
                              <Typography variant="caption" sx={{ color: '#64748B' }}>-</Typography>
                            ) : (
                              player.activeCasualties.map((cas) => (
                                <Tooltip key={cas} title={cas}>
                                  <Chip 
                                    icon={<InjuredIcon sx={{ fontSize: '10px !important', color: '#EF4444' }} />}
                                    label={cas} 
                                    size="small" 
                                    sx={{ height: 18, fontSize: '0.6rem', bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} 
                                  />
                                </Tooltip>
                              ))
                            )}
                          </Box>
                        </TableCell>

                        {/* Matches */}
                        <TableCell align="center" sx={{ fontWeight: 600 }}>{c.played}</TableCell>
                        {/* TD */}
                        <TableCell align="center" sx={{ color: '#00E676', fontWeight: 700 }}>{c.touchdowns}</TableCell>
                        {/* Passes */}
                        <TableCell align="center" sx={{ color: '#38BDF8' }}>{c.passes}</TableCell>
                        {/* Interceptions */}
                        <TableCell align="center">{c.interceptions}</TableCell>
                        {/* Casualties */}
                        <TableCell align="center" sx={{ color: '#E11D48', fontWeight: 700 }}>{c.casualties}</TableCell>
                        {/* MVPs */}
                        <TableCell align="center" sx={{ color: '#F59E0B', fontWeight: 700 }}>{c.mvps}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* TAB 1: Matches History list */}
      {tabValue === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, animation: 'fadeIn 0.2s ease-in-out' }}>
          {matches.length === 0 ? (
            <Paper className="glass-panel" sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucun match enregistré pour le moment.
              </Typography>
            </Paper>
          ) : (
            matches.map((match) => (
              <Card key={match.id} sx={{ borderRadius: 4, border: '1px solid rgba(148, 163, 184, 0.08) !important' }}>
                <CardActionArea onClick={() => navigate(`/matches/${match.id}`)}>
                  <CardContent sx={{ p: 3 }}>
                    
                    {/* Round & Date */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                        Journée {match.round} • {new Date(match.startedAt).toLocaleString()}
                      </Typography>
                      <Chip 
                        label={match.status} 
                        color={match.status === 'PLAYED' || match.status === 'VALIDATED' ? 'success' : 'default'}
                        size="small" 
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                      />
                    </Box>

                    {/* Head-to-Head */}
                    <Grid container alignItems="center" spacing={1}>
                      <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={match.homeTeam.logo || undefined} sx={{ width: 34, height: 34, bgcolor: '#0B0F19' }}>🏈</Avatar>
                        <Box sx={{ overflow: 'hidden' }}>
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                            {match.homeTeam.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            {match.homeCoach?.name || 'Inconnu'}
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
                          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 800, color: '#F8FAFC' }}>
                            {match.awayTeam.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>
                            {match.awayCoach?.name || 'Inconnu'}
                          </Typography>
                        </Box>
                        <Avatar src={match.awayTeam.logo || undefined} sx={{ width: 34, height: 34, bgcolor: '#0B0F19' }}>🏈</Avatar>
                      </Grid>
                    </Grid>

                  </CardContent>
                </CardActionArea>
              </Card>
            ))
          )}
        </Box>
      )}

    </Box>
  );
};
