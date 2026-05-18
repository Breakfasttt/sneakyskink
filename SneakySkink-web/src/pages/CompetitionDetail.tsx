import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  alpha,
  Chip,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  SportsSoccer as CompetitionIcon,
  EmojiEvents as LeagueIcon,
  ArrowForward as ArrowIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { api } from '../api';

const CompetitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRound, setSelectedRound] = useState<string>('ALL');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getCompetition(id)
      .then((res: any) => {
        // Defensive check: API structure is wrapped in { success: true, data: ... }
        const item = res.data || res;
        setCompetition(item);
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

  if (!competition) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: 'text.secondary' }}>Compétition introuvable</Typography>
      </Box>
    );
  }

  const rounds = Array.from(new Set((competition.matches || []).map((m: any) => m.round))).sort((a: any, b: any) => b - a);

  const filteredMatches = (competition.matches || []).filter((m: any) => {
    if (selectedRound === 'ALL') return true;
    return m.round === Number(selectedRound);
  });

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: { xs: 2, md: 4 } }}>
      
      {/* ─── Hero Section ──────────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 4 },
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.08)',
          background: 'linear-gradient(135deg, rgba(30,41,59,0.3) 0%, rgba(15,23,42,0.3) 100%)',
          mb: 4,
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
          <Box>
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

      {/* ─── Matches list ─── */}
      <Paper sx={{ p: 3, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC' }}>
            ⚽ Matchs de la compétition
          </Typography>

          <FormControl size="small" sx={{ minWidth: 120 }}>
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

        {!competition.matches || competition.matches.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center', color: '#64748B' }}>
            <Typography variant="body2">Aucun match disponible pour cette compétition.</Typography>
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
                      transform: 'scale(1.01)',
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
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyCenter: 'space-between', width: '100%' }}>
                        
                        {/* Home Team */}
                        <Box sx={{ flex: 1, textAlign: 'right', pr: 2, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {match.homeTeam?.name}
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
                            {match.awayTeam?.name}
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
    </Box>
  );
};

export default CompetitionDetail;
