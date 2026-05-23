import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  InputBase,
  CircularProgress,
  IconButton,
  Avatar,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as CoachIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { ListGridView } from '../components/ListGridView';
import { ItemCard } from '../components/ItemCard';

const Coaches: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const leagueId = searchParams.get('leagueId') || undefined;
  const [leagueName, setLeagueName] = useState<string | null>(null);

  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'teams'>('name');
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_LIMIT = 24;

  useEffect(() => {
    if (leagueId) {
      api.getLeague(leagueId)
        .then((res: any) => setLeagueName(res.name))
        .catch(() => setLeagueName('Ligue inconnue'));
    } else {
      setLeagueName(null);
    }
  }, [leagueId]);

  const fetchCoaches = useCallback(async (search: string, isAppend = false, activeSort = sortBy, currentOffset = 0) => {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const res: any = await api.getCoaches({
        search: search || undefined,
        limit: PAGE_LIMIT,
        offset: currentOffset,
        sortBy: activeSort,
        sortOrder: activeSort === 'teams' ? 'desc' : 'asc',
        leagueId: leagueId,
      });
      const list = Array.isArray(res) ? res : [];
      setCoaches(prev => isAppend ? [...prev, ...list] : list);
      setHasMore(list.length === PAGE_LIMIT);
    } catch {
      if (!isAppend) setCoaches([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [sortBy, leagueId]);

  useEffect(() => {
    setCoaches([]);
    fetchCoaches(searchQuery, false, sortBy, 0);
  }, [fetchCoaches, leagueId]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCoaches(val.trim(), false, sortBy, 0);
    }, 400);
  };

  const handleSortChange = (newSort: 'name' | 'teams') => {
    setSortBy(newSort);
    setCoaches([]);
    fetchCoaches(searchQuery, false, newSort, 0);
  };

  const handleSync = async () => {
    const nameToSync = searchQuery.trim();
    if (!nameToSync) return;
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(false);
    try {
      await api.syncCoach(nameToSync);
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

  // Les coachs sont déjà triés côté serveur
  const sortedCoaches = coaches;

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
          👥 Coachs
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Consultez et recherchez parmi tous les coachs enregistrés sur le serveur
        </Typography>
        {leagueName && (
          <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={`Filtré par ligue : ${leagueName}`}
              onDelete={() => setSearchParams({})}
              sx={{
                bgcolor: 'rgba(0, 230, 118, 0.08)',
                color: '#00E676',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                fontWeight: 700,
                '& .MuiChip-deleteIcon': {
                  color: '#00E676',
                  '&:hover': { color: '#00C853' },
                },
              }}
            />
          </Box>
        )}
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
          placeholder="Rechercher un coach par son nom..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          sx={{ fontSize: '0.95rem', color: '#F8FAFC' }}
        />
        {loading && <CircularProgress size={18} sx={{ color: '#00E676', ml: 1 }} />}
      </Paper>

      {/* Grid/List unified view */}
      <ListGridView
        loading={loading}
        isEmpty={sortedCoaches.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        sortOptions={[
          { value: 'name', label: 'Nom de coach' },
          { value: 'teams', label: 'Nombre d\'équipes' },
        ]}
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
            <CoachIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Aucun coach trouvé
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
              Essayez de chercher un autre nom ou de réinitialiser la barre de recherche.
            </Typography>

            <Divider sx={{ my: 3, borderColor: 'rgba(148,163,184,0.08)' }} />

            <Box sx={{ maxWidth: 480, mx: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, fontWeight: 600 }}>
                Demander l'importation de ce coach depuis les serveurs Cyanide :
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
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, pl: 4 }}>Coach</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Équipes</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, width: 80, pr: 4 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCoaches.map((coach) => (
                  <TableRow
                    key={coach.id}
                    onClick={() => navigate(`/coach/${coach.id}`)}
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
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: 'rgba(0,230,118,0.06)',
                            border: '1px solid rgba(0,230,118,0.15)',
                            color: '#00E676',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                          }}
                        >
                          {coach.name ? coach.name.charAt(0).toUpperCase() : '?'}
                        </Avatar>
                        <Typography sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                          {coach.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                      <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                        {coach.teamsCount ?? 0}
                      </Typography>
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
            {sortedCoaches.map((coach) => (
              <ItemCard
                key={coach.id}
                title={coach.name}
                onClick={() => navigate(`/coach/${coach.id}`)}
                icon={
                  <Avatar
                    sx={{
                      width: '100%',
                      height: '100%',
                      bgcolor: 'transparent',
                      color: '#00E676',
                      fontWeight: 800,
                      fontSize: '1rem',
                    }}
                  >
                    {coach.name ? coach.name.charAt(0).toUpperCase() : '?'}
                  </Avatar>
                }
                iconBgColor="rgba(0,230,118,0.06)"
                iconBorderColor="rgba(0,230,118,0.15)"
                iconColor="#00E676"
                subtitle={
                  coach.teamsCount !== undefined ? (
                    <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                      {coach.teamsCount} équipe(s)
                    </Typography>
                  ) : undefined
                }
              />
            ))}
          </Box>
        )}
      />

      {hasMore && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            disabled={loadingMore}
            onClick={() => fetchCoaches(searchQuery, true, sortBy, coaches.length)}
            sx={{
              borderColor: 'rgba(0, 230, 118, 0.3)',
              color: '#00E676',
              fontWeight: 700,
              textTransform: 'none',
              px: 4,
              py: 1,
              borderRadius: 2.5,
              '&:hover': {
                borderColor: '#00E676',
                bgcolor: 'rgba(0, 230, 118, 0.04)',
              },
            }}
          >
            {loadingMore ? <CircularProgress size={20} sx={{ color: '#00E676' }} /> : 'Afficher plus'}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default Coaches;
