/**
 * Page de recherche et de consultation des ligues.
 * Permet de lister les ligues et de demander l'importation
 * d'une ligue non encore référencée via son ID Cyanide.
 */

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
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Search as SearchIcon,
  EmojiEvents as LeagueIcon,
  ArrowForward as ArrowIcon,
  People as PeopleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { api } from '../api';

const Leagues: React.FC = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  // Mode d'affichage de la liste des ligues : 'list' ou 'grid'
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // Mode de tri des ligues : 'coaches' (nombre de coachs), 'name' (nom de la ligue) ou 'lastMatch' (dernier match joué)
  const [sortBy, setSortBy] = useState<'coaches' | 'name' | 'lastMatch'>('coaches');

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

  const handleSync = async () => {
    const nameToSync = searchQuery.trim();
    if (!nameToSync) return;
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(false);
    try {
      await api.syncLeague(nameToSync);
      setSyncMessage(
        "Demande d'importation envoyée. Le traitement en arrière-plan n'est pas instantané et dépend de la file d'attente du serveur. L'élément apparaîtra dans la liste une fois importé."
      );
    } catch (err: any) {
      setSyncError(true);
      setSyncMessage("Une erreur est survenue lors de la demande d'importation.");
    } finally {
      setSyncing(false);
    }
  };

  // Filtrage et tri des ligues (exclut les ligues à moins de 15 coachs)
  const filteredLeagues = leagues
    .filter((league) => {
      const matchesSearch = league.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesActive = showInactive ? true : league.active;
      const matchesCoachCount = (league.gamerCount ?? 0) >= 15;
      return matchesSearch && matchesActive && matchesCoachCount;
    })
    .sort((a, b) => {
      if (sortBy === 'coaches') {
        const diff = (b.gamerCount ?? 0) - (a.gamerCount ?? 0);
        if (diff !== 0) return diff;
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'lastMatch') {
        const dateA = a.lastMatchDate ? new Date(a.lastMatchDate).getTime() : 0;
        const dateB = b.lastMatchDate ? new Date(b.lastMatchDate).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return (b.gamerCount ?? 0) - (a.gamerCount ?? 0);
      } else {
        const nameA = a.name || '';
        const nameB = b.name || '';
        const nameCompare = nameA.localeCompare(nameB);
        if (nameCompare !== 0) return nameCompare;
        return (b.gamerCount ?? 0) - (a.gamerCount ?? 0);
      }
    });

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
          🏆 Ligues
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Gérez et explorez toutes les ligues Blood Bowl 3 enregistrées
        </Typography>
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

      {/* Contrôles de tri et d'affichage */}
      {!loading && leagues.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            mb: 3,
            gap: 2,
          }}
        >
          {/* Options de tri */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>
              Trier par :
            </Typography>
            <Button
              size="small"
              onClick={() => setSortBy('coaches')}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 0.5,
                px: 2,
                bgcolor: sortBy === 'coaches' ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                color: sortBy === 'coaches' ? '#00E676' : '#94A3B8',
                border: `1px solid ${sortBy === 'coaches' ? 'rgba(0, 230, 118, 0.3)' : 'rgba(148, 163, 184, 0.12)'}`,
                '&:hover': {
                  bgcolor: sortBy === 'coaches' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sortBy === 'coaches' ? '#00E676' : 'rgba(148, 163, 184, 0.2)'}`,
                },
              }}
            >
              Nombre de coachs
            </Button>
            <Button
              size="small"
              onClick={() => setSortBy('name')}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 0.5,
                px: 2,
                bgcolor: sortBy === 'name' ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                color: sortBy === 'name' ? '#00E676' : '#94A3B8',
                border: `1px solid ${sortBy === 'name' ? 'rgba(0, 230, 118, 0.3)' : 'rgba(148, 163, 184, 0.12)'}`,
                '&:hover': {
                  bgcolor: sortBy === 'name' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sortBy === 'name' ? '#00E676' : 'rgba(148, 163, 184, 0.2)'}`,
                },
              }}
            >
              Nom de ligue
            </Button>
            <Button
              size="small"
              onClick={() => setSortBy('lastMatch')}
              sx={{
                textTransform: 'none',
                borderRadius: 2.5,
                fontWeight: 700,
                fontSize: '0.8rem',
                py: 0.5,
                px: 2,
                bgcolor: sortBy === 'lastMatch' ? 'rgba(0, 230, 118, 0.12)' : 'transparent',
                color: sortBy === 'lastMatch' ? '#00E676' : '#94A3B8',
                border: `1px solid ${sortBy === 'lastMatch' ? 'rgba(0, 230, 118, 0.3)' : 'rgba(148, 163, 184, 0.12)'}`,
                '&:hover': {
                  bgcolor: sortBy === 'lastMatch' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${sortBy === 'lastMatch' ? '#00E676' : 'rgba(148, 163, 184, 0.2)'}`,
                },
              }}
            >
              Dernier match joué
            </Button>
          </Box>

          {/* Mode d'affichage et filtre */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, alignSelf: { xs: 'flex-end', sm: 'auto' } }}>
            {/* Sélection du mode d'affichage */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                bgcolor: 'rgba(15,23,42,0.4)',
                p: 0.5,
                borderRadius: 2,
                border: '1px solid rgba(148,163,184,0.08)',
              }}
            >
              <IconButton
                size="small"
                onClick={() => setViewMode('list')}
                sx={{
                  color: viewMode === 'list' ? '#00E676' : '#64748B',
                  bgcolor: viewMode === 'list' ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
                  borderRadius: 1.5,
                  p: 0.75,
                  '&:hover': {
                    bgcolor: viewMode === 'list' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255,255,255,0.03)',
                  }
                }}
              >
                <ListIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                sx={{
                  color: viewMode === 'grid' ? '#00E676' : '#64748B',
                  bgcolor: viewMode === 'grid' ? 'rgba(0, 230, 118, 0.08)' : 'transparent',
                  borderRadius: 1.5,
                  p: 0.75,
                  '&:hover': {
                    bgcolor: viewMode === 'grid' ? 'rgba(0, 230, 118, 0.12)' : 'rgba(255,255,255,0.03)',
                  }
                }}
              >
                <GridIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>

            {/* Commutateur inactives */}
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
              sx={{ mr: 0 }}
            />
          </Box>
        </Box>
      )}

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
          <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
            Essayez de modifier votre recherche ou d'activer le filtre des ligues inactives.
          </Typography>

          <Divider sx={{ my: 3, borderColor: 'rgba(148,163,184,0.08)' }} />

          <Box sx={{ maxWidth: 480, mx: 'auto' }}>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, fontWeight: 600 }}>
              Demander l'importation de cette ligue depuis les serveurs Cyanide :
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Button
                variant="contained"
                disabled={syncing || !searchQuery.trim()}
                onClick={handleSync}
                sx={{
                  bgcolor: '#00E676',
                  color: '#0F172A',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 3,
                  py: 1,
                  '&:hover': {
                    bgcolor: '#00C853',
                  },
                  '&:disabled': {
                    bgcolor: 'rgba(0,230,118,0.12)',
                    color: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                {syncing ? <CircularProgress size={20} sx={{ color: '#0F172A' }} /> : `Rechercher et importer "${searchQuery}"`}
              </Button>
            </Box>
            {syncMessage && (
              <Typography variant="body2" sx={{ color: syncError ? '#FF3D00' : '#00E676', fontWeight: 600, mt: 1, display: 'block' }}>
                {syncMessage}
              </Typography>
            )}
          </Box>
        </Paper>
      ) : viewMode === 'list' ? (
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            borderRadius: 3,
            border: '1px solid rgba(148,163,184,0.08)',
            background: 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(15,23,42,0.4) 100%)',
            overflow: 'hidden',
          }}
        >
          <Table sx={{ minWidth: 600 }}>
            <TableHead sx={{ bgcolor: 'rgba(15,23,42,0.6)', borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
              <TableRow>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, pl: 4 }}>Ligue</TableCell>
                <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Coachs</TableCell>
                <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Dernier match</TableCell>
                <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Statut</TableCell>
                <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, width: 80, pr: 4 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLeagues.map((league) => (
                <TableRow
                  key={league.id}
                  onClick={() => navigate(`/ligue/${league.id}`)}
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
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: 1.5,
                          bgcolor: league.active ? 'rgba(0,230,118,0.06)' : 'rgba(148,163,184,0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                          color: league.active ? '#00E676' : '#94A3B8',
                        }}
                      >
                        <LeagueIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                        {league.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#F8FAFC', fontWeight: 600 }}>
                      <PeopleIcon sx={{ fontSize: 16, color: '#64748B' }} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {league.gamerCount ?? 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                      {league.lastMatchDate ? new Date(league.lastMatchDate).toLocaleDateString('fr-FR') : 'Aucun'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
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
      ) : (
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
          {filteredLeagues.map((league) => (
            <Paper
              key={league.id}
              onClick={() => navigate(`/ligue/${league.id}`)}
              elevation={0}
              sx={{
                width: '100%',
                height: 96,
                p: 2,
                borderRadius: '8px',
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, flex: 1 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: league.active ? 'rgba(0,230,118,0.06)' : 'rgba(148,163,184,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                    color: league.active ? '#00E676' : '#94A3B8',
                    flexShrink: 0,
                  }}
                >
                  <LeagueIcon sx={{ fontSize: 20 }} />
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {league.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                      <PeopleIcon sx={{ fontSize: 13 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {league.gamerCount ?? 0} coachs
                      </Typography>
                    </Box>
                    <Chip
                      icon={league.active ? <ActiveIcon style={{ fontSize: 10, color: '#00E676' }} /> : <InactiveIcon style={{ fontSize: 10, color: '#94A3B8' }} />}
                      label={league.active ? 'Active' : 'Inactive'}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        bgcolor: league.active ? 'rgba(0,230,118,0.08)' : 'rgba(148,163,184,0.08)',
                        color: league.active ? '#00E676' : '#94A3B8',
                        border: `1px solid ${league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}`,
                        '& .MuiChip-icon': { color: 'inherit', marginLeft: '2px', marginRight: '-2px' }
                      }}
                    />
                  </Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, fontWeight: 500 }}>
                    <DateIcon sx={{ fontSize: 12 }} />
                    Dernier match : {league.lastMatchDate ? new Date(league.lastMatchDate).toLocaleDateString('fr-FR') : 'Aucun'}
                  </Typography>
                </Box>
              </Box>

              <IconButton
                sx={{
                  color: '#334155',
                  bgcolor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(148,163,184,0.06)',
                  borderRadius: '8px',
                  p: 0.75,
                  ml: 1.5,
                  transition: 'all 0.2s',
                  '&:hover': {
                    color: '#00E676',
                    bgcolor: 'rgba(0,230,118,0.05)',
                    border: '1px solid rgba(0,230,118,0.2)',
                  }
                }}
              >
                <ArrowIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Leagues;
