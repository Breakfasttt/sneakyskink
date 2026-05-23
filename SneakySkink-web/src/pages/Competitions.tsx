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
  Chip,
  IconButton,
  Select,
  MenuItem,
  FormControl,
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
  SportsSoccer as CompetitionIcon,
  ArrowForward as ArrowIcon,
  EmojiEvents as LeagueIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { ListGridView } from '../components/ListGridView';
import { ItemCard } from '../components/ItemCard';

const Competitions: React.FC = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'league' | 'status' | 'teams'>('name');
  const [hasMore, setHasMore] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_LIMIT = 24;

  const fetchCompetitions = useCallback(async (
    search: string,
    isAppend = false,
    activeSort = sortBy,
    activeFormat = formatFilter,
    activeStatus = statusFilter,
    currentOffset = 0
  ) => {
    if (isAppend) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const order = activeSort === 'teams' ? 'desc' : 'asc';
      const res: any = await api.getCompetitions({
        limit: PAGE_LIMIT,
        offset: currentOffset,
        format: activeFormat === 'ALL' ? undefined : activeFormat,
        status: activeStatus === 'ALL' ? undefined : activeStatus,
        search: search.trim() || undefined,
        sortBy: activeSort,
        sortOrder: order as any
      });

      const list = Array.isArray(res) ? res : [];
      setCompetitions(prev => isAppend ? [...prev, ...list] : list);
      setHasMore(list.length === PAGE_LIMIT);
    } catch {
      if (!isAppend) setCompetitions([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions('', false, 'name', 'ALL', 'ALL', 0);
  }, [fetchCompetitions]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCompetitions(val, false, sortBy, formatFilter, statusFilter, 0);
    }, 400);
  };

  const handleSortChange = (newSort: 'name' | 'league' | 'status' | 'teams') => {
    setSortBy(newSort);
    setCompetitions([]);
    fetchCompetitions(searchQuery, false, newSort, formatFilter, statusFilter, 0);
  };

  const handleFormatFilterChange = (newFormat: string) => {
    setFormatFilter(newFormat);
    setCompetitions([]);
    fetchCompetitions(searchQuery, false, sortBy, newFormat, statusFilter, 0);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCompetitions([]);
    fetchCompetitions(searchQuery, false, sortBy, formatFilter, newStatus, 0);
  };

  const handleSync = async () => {
    const nameToSync = searchQuery.trim();
    if (!nameToSync) return;
    setSyncing(true);
    setSyncMessage(null);
    setSyncError(false);
    try {
      await api.syncCompetition(nameToSync);
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

  // Les compétitions sont filtrées et triées côté serveur
  const sortedCompetitions = competitions;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'InProgress': return '#3B82F6';
      case 'Played':
      case 'Validated': return '#00E676';
      case 'Scheduled': return '#F59E0B';
      default: return '#64748B';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'InProgress': return 'En cours';
      case 'Played': return 'Jouée';
      case 'Validated': return 'Validée';
      case 'Scheduled': return 'Planifiée';
      default: return status;
    }
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', py: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', letterSpacing: '-0.03em' }}>
            🎯 Compétitions
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Suivez le déroulement de tous les tournois et championnats
          </Typography>
        </Box>
      </Box>

      {/* Search Bar only */}
      <Box sx={{ mb: 4 }}>
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            px: 2,
            height: 48,
            borderRadius: 3,
            border: '1px solid rgba(148,163,184,0.12)',
            bgcolor: 'rgba(21,29,48,0.8)',
            '&:focus-within': {
              border: '1px solid rgba(0,230,118,0.4)',
            },
            transition: 'all 0.2s',
          }}
        >
          <SearchIcon sx={{ color: '#475569', mr: 1 }} />
          <InputBase
            fullWidth
            placeholder="Rechercher par compétition ou ligue..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            sx={{ fontSize: '0.9rem', color: '#F8FAFC' }}
          />
          {loading && <CircularProgress size={18} sx={{ color: '#00E676', ml: 1 }} />}
        </Paper>
      </Box>

      {/* Grid/List unified view */}
      <ListGridView
        loading={loading}
        isEmpty={sortedCompetitions.length === 0}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        sortOptions={[
          { value: 'name', label: 'Nom' },
          { value: 'league', label: 'Ligue' },
          { value: 'status', label: 'Statut' },
          { value: 'teams', label: 'Équipes' },
        ]}
        extraControls={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilterChange(e.target.value as string)}
                displayEmpty
                sx={{
                  height: 38,
                  bgcolor: 'rgba(21,29,48,0.8)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 2.5,
                  color: '#F8FAFC',
                  fontSize: '0.8rem',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: '0.8rem' }}>Tous les statuts</MenuItem>
                <MenuItem value="InProgress" sx={{ fontSize: '0.8rem' }}>En cours</MenuItem>
                <MenuItem value="Scheduled" sx={{ fontSize: '0.8rem' }}>Planifiée</MenuItem>
                <MenuItem value="Validated" sx={{ fontSize: '0.8rem' }}>Validée</MenuItem>
                <MenuItem value="Played" sx={{ fontSize: '0.8rem' }}>Jouée</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={formatFilter}
                onChange={(e) => handleFormatFilterChange(e.target.value as string)}
                displayEmpty
                sx={{
                  height: 38,
                  bgcolor: 'rgba(21,29,48,0.8)',
                  border: '1px solid rgba(148,163,184,0.12)',
                  borderRadius: 2.5,
                  color: '#F8FAFC',
                  fontSize: '0.8rem',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                }}
              >
                <MenuItem value="ALL" sx={{ fontSize: '0.8rem' }}>Tous les formats</MenuItem>
                <MenuItem value="RoundRobin" sx={{ fontSize: '0.8rem' }}>Championnat</MenuItem>
                <MenuItem value="Knockout" sx={{ fontSize: '0.8rem' }}>Élimination directe</MenuItem>
                <MenuItem value="Wissen" sx={{ fontSize: '0.8rem' }}>Ronde suisse</MenuItem>
                <MenuItem value="Ladder" sx={{ fontSize: '0.8rem' }}>Échelle</MenuItem>
              </Select>
            </FormControl>
          </Box>
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
            <CompetitionIcon sx={{ color: '#334155', fontSize: 48, mb: 1.5 }} />
            <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 700 }}>
              Aucune compétition trouvée
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B', mb: 3 }}>
              Veuillez ajuster vos filtres de recherche.
            </Typography>

            <Divider sx={{ my: 3, borderColor: 'rgba(148,163,184,0.08)' }} />

            <Box sx={{ maxWidth: 480, mx: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, fontWeight: 600 }}>
                Demander l'importation de cette compétition depuis les serveurs Cyanide :
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
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, pl: 4 }}>Compétition</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Ligue</TableCell>
                  <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Format</TableCell>
                  <TableCell align="center" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Statut</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2 }}>Équipes</TableCell>
                  <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: 'none', py: 2, width: 80, pr: 4 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCompetitions.map((comp) => {
                  const statusColor = getStatusColor(comp.status);
                  return (
                    <TableRow
                      key={comp.id}
                      onClick={() => navigate(`/competition/${comp.id}`)}
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
                              bgcolor: 'rgba(59,130,246,0.06)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(59,130,246,0.15)',
                              color: '#3B82F6',
                            }}
                          >
                            <CompetitionIcon sx={{ fontSize: 18 }} />
                          </Box>
                          <Typography sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                            {comp.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#94A3B8' }}>
                          <LeagueIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {comp.leagueName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500 }}>
                          {comp.format === 'RoundRobin'
                            ? 'Championnat'
                            : comp.format === 'Knockout'
                            ? 'Élimination directe'
                            : comp.format === 'Wissen'
                            ? 'Ronde suisse'
                            : comp.format === 'Ladder'
                            ? 'Échelle'
                            : comp.format}
                        </Typography>
                      </TableCell>
                      <TableCell align="center" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                        <Chip
                          label={getStatusLabel(comp.status)}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            bgcolor: alpha(statusColor, 0.08),
                            color: statusColor,
                            border: `1px solid ${alpha(statusColor, 0.15)}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ borderBottom: '1px solid rgba(148,163,184,0.06)', py: 2 }}>
                        <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 600 }}>
                          {comp.teamsCount !== undefined ? `${comp.teamsCount}/${comp.teamsMax ?? '∞'}` : '-'}
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
                  );
                })}
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
            {sortedCompetitions.map((comp) => {
              const statusColor = getStatusColor(comp.status);
              return (
                <ItemCard
                  key={comp.id}
                  title={comp.name}
                  onClick={() => navigate(`/competition/${comp.id}`)}
                  icon={<CompetitionIcon sx={{ fontSize: 20 }} />}
                  iconBgColor="rgba(59,130,246,0.06)"
                  iconBorderColor="rgba(59,130,246,0.15)"
                  iconColor="#3B82F6"
                  subtitle={
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#64748B' }}>
                        <LeagueIcon sx={{ fontSize: 12, color: '#F59E0B' }} />
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {comp.leagueName}
                        </Typography>
                      </Box>
                      <Chip
                        label={getStatusLabel(comp.status)}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          bgcolor: alpha(statusColor, 0.08),
                          color: statusColor,
                          border: `1px solid ${alpha(statusColor, 0.15)}`,
                        }}
                      />
                    </>
                  }
                  description={
                    comp.teamsCount !== undefined ? `${comp.teamsCount}/${comp.teamsMax ?? '∞'} équipes` : undefined
                  }
                />
              );
            })}
          </Box>
        )}
      />

      {hasMore && !loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="outlined"
            disabled={loadingMore}
            onClick={() => fetchCompetitions(searchQuery, true, sortBy, formatFilter, statusFilter, competitions.length)}
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

export default Competitions;
