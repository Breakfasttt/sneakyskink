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
} from '@mui/icons-material';
import axios from 'axios';
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
          axios.get(`http://localhost:3001/teams/${id}?includePlayers=true`),
          axios.get(`http://localhost:3001/matches?teamId=${id}`),
        ]);

        setTeam(teamRes.data.data);
        setMatches(matchesRes.data.data || []);
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
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h5" color="error">
          Équipe introuvable dans la base de données.
        </Typography>
        <Button onClick={() => navigate('/search')} sx={{ mt: 2 }}>
          Retour
        </Button>
      </Box>
    );
  }

  const race = getRaceInfo(team.raceId);
  const activePlayers = team.players?.filter(p => p.status === 'ACTIVE') || [];
  const deadPlayers = team.players?.filter(p => p.status === 'MORT') || [];

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Back button */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate('/search')}
        sx={{ mb: 3, fontWeight: 700, color: '#94A3B8' }}
      >
        Retour à la Recherche
      </Button>

      {/* Profile Header Banner */}
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          borderLeft: `4px solid ${race.color} !important`,
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={2} sx={{ display: 'flex', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
            <Avatar
              src={team.logo || undefined}
              alt={team.name}
              sx={{
                width: 96,
                height: 96,
                bgcolor: '#0B0F19',
                border: `2px solid ${race.color}`,
                boxShadow: `0 0 16px ${race.color}33`,
              }}
            >
              🏈
            </Avatar>
          </Grid>
          <Grid item xs={12} sm={7} sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h3" sx={{ fontFamily: 'Outfit', fontWeight: 900 }}>
              {team.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, mt: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-start' } }}>
              <Chip label={`${race.emoji} ${race.name}`} sx={{ fontWeight: 700, bgcolor: 'rgba(255,255,255,0.05)' }} />
              <Chip label={`Valeur : ${Math.round(team.value / 1000)}k TV`} color="warning" sx={{ fontWeight: 800 }} />
            </Box>
            <Typography
              variant="body1"
              onClick={() => navigate(`/coaches/${team.coachId}`)}
              sx={{ color: '#94A3B8', mt: 2, fontWeight: 600, cursor: 'pointer', '&:hover': { color: '#00E676' } }}
            >
              Coach : {team.coachName} {team.coachCountry && `(${team.coachCountry})`}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={3} sx={{ textAlign: { xs: 'center', sm: 'right' } }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#00E676', fontFamily: 'Outfit' }}>
              {team.wins} - {team.draws} - {team.losses}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>
              Bilan (V - N - D) &bull; {team.matchesCount} Matchs
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Roster Actif" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label="Trésorerie & Staff" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label={`Historique Matchs (${matches.length})`} sx={{ fontWeight: 700, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* Tab 0: Active Roster */}
      {tabValue === 0 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <TableContainer component={Paper} sx={{ bgcolor: '#151D30', border: '1px solid rgba(148, 163, 184, 0.08)' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center" style={{ width: 40 }}>#</TableCell>
                  <TableCell>Nom</TableCell>
                  <TableCell>Poste</TableCell>
                  <TableCell align="center">Valeur</TableCell>
                  <TableCell align="center">Profil</TableCell>
                  <TableCell align="center">Niv / XP</TableCell>
                  <TableCell>Compétences Innées</TableCell>
                  <TableCell>Compétences Acquises</TableCell>
                  <TableCell>Blessures</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activePlayers.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell align="center" sx={{ fontWeight: 700 }}>{p.number}</TableCell>
                    <TableCell sx={{ fontWeight: 650 }}>{p.name || `Joueur #${p.number}`}</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>{p.type.replace(/^[a-z]+_/i, '')}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#F59E0B' }}>{p.value / 1000}k</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        <Chip label={`MA:${p.ma}`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)', px: 0.2 }} />
                        <Chip label={`ST:${p.st}`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)', px: 0.2 }} />
                        <Chip label={`AG:${p.ag}+`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)', px: 0.2 }} />
                        <Chip label={`PA:${p.pa}+`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)', px: 0.2 }} />
                        <Chip label={`AV:${p.av}+`} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.03)', px: 0.2 }} />
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 600 }}>
                      <span style={{ color: '#00E676' }}>L{p.level}</span> <span style={{ color: '#64748B', fontSize: '0.75rem' }}>({p.xp} XP)</span>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {p.innateSkills.map(sk => (
                          <Chip key={sk} label={sk} size="small" sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(255,255,255,0.02)', color: '#94A3B8' }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {p.acquiredSkills.map(sk => (
                          <Chip key={sk} label={sk} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }} />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {p.activeCasualties.length > 0 ? (
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {p.activeCasualties.map(cas => (
                            <Chip key={cas} label={cas} size="small" color="error" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />
                          ))}
                        </Box>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Retired or Dead Players list if any */}
          {deadPlayers.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2, color: '#E11D48' }}>
                💀 Cimetière / Mémorial de l'Équipe
              </Typography>
              <TableContainer component={Paper} sx={{ bgcolor: 'rgba(225, 29, 72, 0.03)', border: '1px solid rgba(225, 29, 72, 0.15)' }}>
                <Table size="small">
                  <TableBody>
                    {deadPlayers.map(p => (
                      <TableRow key={p.id}>
                        <TableCell align="center" style={{ width: 40, fontWeight: 700 }}>{p.number}</TableCell>
                        <TableCell sx={{ fontWeight: 650 }}>{p.name || `Héros Mort`}</TableCell>
                        <TableCell sx={{ color: '#94A3B8' }}>{p.type.replace(/^[a-z]+_/i, '')}</TableCell>
                        <TableCell align="right" sx={{ color: '#E11D48', fontWeight: 700 }}>Décédé en match (Lvl {p.level}) 💀</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {/* Tab 1: Staff and Treasury */}
      {tabValue === 1 && (
        <Grid container spacing={3} sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {/* Treasury info */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                  <CashIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Trésorerie / Cash</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>{team.cash / 1000} 000 po</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Apothecary info */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: team.apothecary ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255,255,255,0.02)', color: team.apothecary ? '#00E676' : '#64748B' }}>
                  <ShieldIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Apothicaire</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>{team.apothecary ? 'Disponible' : 'Aucun'}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Rerolls info */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(56, 189, 248, 0.1)', color: '#38BDF8' }}>
                  <RerollIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Relances d'Équipe</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>{team.rerolls} relance{team.rerolls > 1 ? 's' : ''}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Fans info */}
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'rgba(167, 139, 250, 0.1)', color: '#A78BFA' }}>
                  <FansIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Popularité (FAME)</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>+{team.popularity} Popularité</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Staff detail lists */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3 }}>
                  📢 Personnel d'Encadrement de l'Équipe
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#94A3B8' }}>Cheerleaders (Pom-pom girls)</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>{team.cheerleaders}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="subtitle2" sx={{ color: '#94A3B8' }}>Entraîneurs Assistants</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'Outfit' }}>{team.assistantCoaches}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Matches list */}
      {tabValue === 2 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          {matches.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#151D30' }}>
              <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                Aucun match enregistré pour cette équipe.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {matches.map((match: any) => {
                const isHome = match.homeTeam.id === team.id;
                const myScore = isHome ? match.homeTeam.score : match.awayTeam.score;
                const oppScore = isHome ? match.awayTeam.score : match.homeTeam.score;
                const oppTeam = isHome ? match.awayTeam : match.homeTeam;
                const isWin = myScore > oppScore;
                const isDraw = myScore === oppScore;

                return (
                  <Grid item xs={12} md={6} key={match.id}>
                    <Card
                      className="hover-scale"
                      onClick={() => navigate(`/matches/${match.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
                            {new Date(match.startedAt).toLocaleDateString()} &bull; {match.leagueName}
                          </Typography>
                          <Chip
                            label={isWin ? 'Victoire' : isDraw ? 'Nul' : 'Défaite'}
                            size="small"
                            color={isWin ? 'success' : isDraw ? 'warning' : 'error'}
                            sx={{ fontWeight: 800, fontSize: '0.65rem', height: 18 }}
                          />
                        </Box>

                        <Grid container alignItems="center" spacing={1}>
                          <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {team.name}
                            </Typography>
                          </Grid>
                          <Grid item xs={2} sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 900 }}>
                              {myScore} - {oppScore}
                            </Typography>
                          </Grid>
                          <Grid item xs={5} sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end', textAlign: 'right' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', pr: 1 }}>
                              {oppTeam.name}
                            </Typography>
                            <Avatar src={oppTeam.logo || undefined} sx={{ width: 28, height: 28 }} />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}
    </Box>
  );
};
