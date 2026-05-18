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
  Divider,
} from '@mui/material';
import {
  Group as TeamIcon,
  Person as CoachIcon,
  SportsSoccer as MatchIcon,
  EmojiEvents as TrophyIcon,
  AttachMoney as MoneyIcon,
  Refresh as RerollIcon,
} from '@mui/icons-material';
import { api } from '../api';

const TeamDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getTeam(id)
      .then((data) => {
        setTeam(data);
      })
      .catch(() => {})
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

  // Group players by status
  const activePlayers = (team.players || []).filter((p: any) => p.status === 'ACTIVE');
  const deadPlayers = (team.players || []).filter((p: any) => p.status === 'DEAD');

  const getRaceName = (raceId: number) => {
    // Basic lookup for popular Blood Bowl 3 races
    const races: Record<number, string> = {
      1: 'Humains', 2: 'Orcs', 3: 'Nains', 4: 'Elfes Sylvains', 5: 'Élus du Chaos',
      6: 'Humains Impériaux', 7: 'Noblesse Impériale', 8: 'Orques Noirs', 9: 'Alliance du Vieux Monde',
      10: 'Nurgle', 11: 'Renégats du Chaos', 12: 'Amazones', 13: 'Bas-Fonds',
      14: 'Nains du Chaos', 15: 'Lézards', 17: 'Hauts Elfes', 18: 'Nécromantiques',
      19: 'Morts-Vivants', 22: 'Slanns', 24: 'Gobelins', 25: 'Halflings', 26: 'Ogres',
      29: 'Vampires'
    };
    return races[raceId] || `Race ${raceId}`;
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
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: 'rgba(168,85,247,0.06)',
                  border: '1px solid rgba(168,85,247,0.2)',
                  color: '#A855F7',
                }}
              >
                <TeamIcon sx={{ fontSize: 36 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.02em', mb: 0.5 }}>
                  {team.name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Chip
                    label={getRaceName(team.raceId)}
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
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B', cursor: 'pointer', '&:hover': { color: '#00E676' } }}
                    onClick={() => navigate(`/coach/${team.coachId}`)}
                  >
                    <CoachIcon sx={{ fontSize: 13 }} />
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Coach: {team.coach?.name || 'Inconnu'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={4} sx={{ textAlign: { sm: 'right' } }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
              Valeur d'Équipe (TV)
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: '2rem', color: '#00E676', lineHeight: 1 }}>
              {(team.value / 1000).toFixed(0)}k
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* ─── Team Stats Grid ─── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4} sm={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <RerollIcon sx={{ color: '#3B82F6', fontSize: 18, mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Relances</Typography>
            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{team.rerolls}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <MoneyIcon sx={{ color: '#F59E0B', fontSize: 18, mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Trésorerie</Typography>
            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1.2rem' }}>{(team.cash / 1000).toFixed(0)}k</Typography>
          </Paper>
        </Grid>
        <Grid item xs={4} sm={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <TrophyIcon sx={{ color: '#00E676', fontSize: 18, mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Victoires</Typography>
            <Typography sx={{ fontWeight: 800, color: '#00E676', fontSize: '1.2rem' }}>{team.wins}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <MatchIcon sx={{ color: '#94A3B8', fontSize: 18, mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Nuls</Typography>
            <Typography sx={{ fontWeight: 800, color: '#94A3B8', fontSize: '1.2rem' }}>{team.draws}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={2.4}>
          <Paper sx={{ p: 2, borderRadius: 2.5, border: '1px solid rgba(148,163,184,0.06)', bgcolor: 'rgba(15,23,42,0.4)', textAlign: 'center' }}>
            <MatchIcon sx={{ color: '#FF3D00', fontSize: 18, mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 600 }}>Défaites</Typography>
            <Typography sx={{ fontWeight: 800, color: '#FF3D00', fontSize: '1.2rem' }}>{team.losses}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Roster Table ─── */}
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
              {activePlayers.map((player: any) => (
                <TableRow key={player.id} sx={{ '& td': { borderBottom: '1px solid rgba(148,163,184,0.04)' }, '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' } }}>
                  <TableCell sx={{ color: '#00E676', fontWeight: 800 }}>{player.number}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                      {player.name || 'Sans Nom'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      {player.type} · Niveaux {player.level} ({player.xp} XP)
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{player.ma}</TableCell>
                  <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{player.st}</TableCell>
                  <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{player.ag}+</TableCell>
                  <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{player.pa || '-'}+</TableCell>
                  <TableCell align="center" sx={{ color: '#F8FAFC', fontWeight: 700 }}>{player.av}+</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(player.innateSkills || []).slice(0, 3).map((skill: string) => (
                        <Chip key={skill} label={skill} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)', color: '#94A3B8' }} />
                      ))}
                      {(player.acquiredSkills || []).map((skill: string) => (
                        <Chip key={skill} label={skill} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: 'rgba(0,230,118,0.08)', color: '#00E676', border: '1px solid rgba(0,230,118,0.15)' }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
                    {(player.value / 1000).toFixed(0)}k
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* ─── Memorial (Dead players) ─── */}
      {deadPlayers.length > 0 && (
        <Paper sx={{ p: 3, border: '1px solid rgba(255,61,0,0.15)', borderRadius: 3, bgcolor: 'rgba(255,61,0,0.02)' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FF3D00', mb: 2 }}>
            💀 Mémorial des Joueurs Décédés ({deadPlayers.length})
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {deadPlayers.map((player: any) => (
              <Chip
                key={player.id}
                avatar={<Avatar sx={{ bgcolor: 'rgba(255,61,0,0.1)', color: '#FF3D00', fontSize: '0.75rem', fontWeight: 800 }}>{player.number}</Avatar>}
                label={`${player.name || 'Sans Nom'} (${player.type})`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,61,0,0.2)',
                  color: '#FF3D00',
                  fontWeight: 600,
                  bgcolor: 'rgba(255,61,0,0.02)'
                }}
              />
            ))}
          </Box>
        </Paper>
      )}

    </Box>
  );
};

export default TeamDetail;
