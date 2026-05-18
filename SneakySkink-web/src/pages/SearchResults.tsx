import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  EmojiEvents as LeagueIcon,
  Person as CoachIcon,
  Group as TeamIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { api } from '../api';

const SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);

    Promise.all([
      api.getLeagues(),
      api.getCoaches({ search: query, limit: 15 }),
      api.getTeams({ search: query }),
    ])
      .then(([leaguesRes, coachesRes, teamsRes]) => {
        const leaguesList = leaguesRes.data || leaguesRes || [];
        const coachesList = coachesRes.data || coachesRes || [];
        const teamsList = teamsRes.data || teamsRes || [];

        const filteredLeagues = (Array.isArray(leaguesList) ? leaguesList : [])
          .filter((l: any) => l.name?.toLowerCase().includes(query.toLowerCase()));

        setLeagues(filteredLeagues);
        setCoaches(Array.isArray(coachesList) ? coachesList : []);
        setTeams(Array.isArray(teamsList) ? teamsList : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  const hasResults = leagues.length > 0 || coaches.length > 0 || teams.length > 0;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#00E676' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', py: { xs: 2, md: 4 } }}>
      <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', mb: 1, letterSpacing: '-0.02em' }}>
        🔍 Résultats de recherche
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748B', mb: 4 }}>
        Résultats pour : "{query}"
      </Typography>

      {!hasResults ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            border: '1px dashed rgba(148,163,184,0.08)',
            borderRadius: 3,
            bgcolor: 'rgba(15,23,42,0.4)',
          }}
        >
          <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Aucun résultat trouvé
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Aucun coach, ligue ou équipe ne correspond à votre recherche.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          
          {/* Leagues */}
          {leagues.length > 0 && (
            <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🏆 Ligues ({leagues.length})
              </Typography>
              <List disablePadding>
                {leagues.map((l, index) => (
                  <React.Fragment key={l.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton onClick={() => navigate(`/ligue/${l.id}`)} sx={{ py: 1.5, borderRadius: 2 }}>
                      <ListItemIcon sx={{ minWidth: 40, color: '#F59E0B' }}><LeagueIcon /></ListItemIcon>
                      <ListItemText primary={l.name} primaryTypographyProps={{ fontWeight: 700, color: '#F8FAFC' }} />
                      <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* Coaches */}
          {coaches.length > 0 && (
            <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                👥 Coachs ({coaches.length})
              </Typography>
              <List disablePadding>
                {coaches.map((c, index) => (
                  <React.Fragment key={c.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton onClick={() => navigate(`/coach/${c.id}`)} sx={{ py: 1.5, borderRadius: 2 }}>
                      <ListItemIcon sx={{ minWidth: 40, color: '#00E676' }}><CoachIcon /></ListItemIcon>
                      <ListItemText primary={c.name} secondary={c.country} primaryTypographyProps={{ fontWeight: 700, color: '#F8FAFC' }} secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748B' }} />
                      <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

          {/* Teams */}
          {teams.length > 0 && (
            <Paper sx={{ p: 2.5, border: '1px solid rgba(148,163,184,0.08)', borderRadius: 3, bgcolor: 'rgba(15,23,42,0.4)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🛡️ Équipes ({teams.length})
              </Typography>
              <List disablePadding>
                {teams.map((t, index) => (
                  <React.Fragment key={t.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton onClick={() => navigate(`/equipe/${t.id}`)} sx={{ py: 1.5, borderRadius: 2 }}>
                      <ListItemIcon sx={{ minWidth: 40, color: '#A855F7' }}><TeamIcon /></ListItemIcon>
                      <ListItemText primary={t.name} secondary={`TV: ${(t.value / 1000).toFixed(0)}k`} primaryTypographyProps={{ fontWeight: 700, color: '#F8FAFC' }} secondaryTypographyProps={{ fontSize: '0.75rem', color: '#64748B' }} />
                      <ArrowIcon sx={{ fontSize: 16, color: '#334155' }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}

        </Box>
      )}
    </Box>
  );
};

export default SearchResults;
