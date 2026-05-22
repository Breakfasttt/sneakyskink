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
  InputBase,
  CircularProgress,
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
  CalendarToday as DateIcon,
} from '@mui/icons-material';
import { api } from '../api';

import { ListGridView } from '../components/ListGridView';
import { ItemCard } from '../components/ItemCard';

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

      {/* Grid/List unified view */}
      <ListGridView
        loading={loading}
        isEmpty={filteredLeagues.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: 'coaches', label: 'Nombre de coachs' },
          { value: 'name', label: 'Nom de ligue' },
          { value: 'lastMatch', label: 'Dernier match joué' },
        ]}
        extraControls={
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
        }
        renderEmptyState={() => (
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
        )}
        renderList={() => (
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
        )}
        renderGrid={() => (
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
              <ItemCard
                key={league.id}
                title={league.name}
                onClick={() => navigate(`/ligue/${league.id}`)}
                icon={<LeagueIcon sx={{ fontSize: 20 }} />}
                iconBgColor={league.active ? 'rgba(0,230,118,0.06)' : 'rgba(148,163,184,0.06)'}
                iconBorderColor={league.active ? 'rgba(0,230,118,0.15)' : 'rgba(148,163,184,0.15)'}
                iconColor={league.active ? '#00E676' : '#94A3B8'}
                subtitle={
                  <>
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
                  </>
                }
                description={
                  <>
                    <DateIcon sx={{ fontSize: 12 }} />
                    Dernier match : {league.lastMatchDate ? new Date(league.lastMatchDate).toLocaleDateString('fr-FR') : 'Aucun'}
                  </>
                }
              />
            ))}
          </Box>
        )}
      />
    </Box>
  );
};

export default Leagues;
