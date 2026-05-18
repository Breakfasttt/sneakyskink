import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  InputBase,
  CircularProgress,
  alpha,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  EmojiEvents as LeagueIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { api } from '../api';

const Leagues: React.FC = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getLeagues()
      .then((res: any) => {
        const list = res.data || res || [];
        setLeagues(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredLeagues = leagues.filter((league) => {
    const matchesSearch = league.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesActive = showInactive ? true : league.active;
    return matchesSearch && matchesActive;
  });

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            🏆 Ligues
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Gérez et explorez toutes les ligues Blood Bowl 3 enregistrées
          </Typography>
        </Box>

        {/* Filter controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': { color: '#00E676' },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#00E676' },
                }}
              />
            }
            label={<Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>Afficher inactives</Typography>}
          />
        </Box>
      </Box>

      {/* Search Bar */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2.5,
          py: 1,
          borderRadius: 3,
          border: '1px solid rgba(148,163,184,0.12)',
          bgcolor: 'rgba(21,29,48,0.8)',
          mb: 4,
          '&:focus-within': {
            border: '1px solid rgba(0,230,118,0.4)',
          },
          transition: 'all 0.2s',
        }}
      >
        <SearchIcon sx={{ color: '#475569', mr: 1.5 }} />
        <InputBase
          fullWidth
          placeholder="Rechercher une ligue..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ fontSize: '0.95rem', color: '#F8FAFC' }}
        />
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00E676' }} />
        </Box>
      ) : filteredLeagues.length === 0 ? (
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
          <LeagueIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
          <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
            Aucune ligue trouvée
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Essayez de modifier votre recherche ou d'activer le filtre des ligues inactives.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredLeagues.map((league) => (
            <Grid item xs={12} sm={6} key={league.id}>
              <Paper
                onClick={() => navigate(`/ligue/${league.id}`)}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: `1px solid rgba(148,163,184,0.08)`,
                  background: 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.4) 100%)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    border: '1px solid rgba(0,230,118,0.3)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 24px rgba(0,230,118,0.05)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: league.active ? 'rgba(0,230,118,0.06)' : 'rgba(148,163,184,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                      color: league.active ? '#00E676' : '#94A3B8',
                      flexShrink: 0,
                    }}
                  >
                    <LeagueIcon sx={{ fontSize: 24 }} />
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {league.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                        <PeopleIcon sx={{ fontSize: 13 }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {league.gamerCount ?? 0} coachs
                        </Typography>
                      </Box>
                      <Chip
                        icon={league.active ? <ActiveIcon style={{ fontSize: 11, color: '#00E676' }} /> : <InactiveIcon style={{ fontSize: 11, color: '#94A3B8' }} />}
                        label={league.active ? 'Active' : 'Inactive'}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.62rem',
                          fontWeight: 700,
                          bgcolor: league.active ? 'rgba(0,230,118,0.08)' : 'rgba(148,163,184,0.08)',
                          color: league.active ? '#00E676' : '#94A3B8',
                          border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                          '& .MuiChip-icon': { color: 'inherit', marginLeft: '4px', marginRight: '-2px' }
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <IconButton
                  sx={{
                    color: '#334155',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(148,163,184,0.06)',
                    borderRadius: 2,
                    p: 1,
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: '#00E676',
                      bgcolor: 'rgba(0,230,118,0.05)',
                      border: '1px solid rgba(0,230,118,0.2)',
                    }
                  }}
                >
                  <ArrowIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Leagues;
