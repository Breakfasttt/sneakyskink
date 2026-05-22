import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'teams'>('name');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCoaches = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const res: any = await api.getCoaches({ search: search || undefined, limit: 100 });
      const list = res.data || res || [];
      setCoaches(Array.isArray(list) ? list : []);
    } catch {
      setCoaches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoaches('');
  }, [fetchCoaches]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCoaches(val.trim());
    }, 400);
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

  // Tri des coachs côté client
  const sortedCoaches = [...coaches].sort((a, b) => {
    if (sortBy === 'teams') {
      const diff = (b.teamsCount ?? 0) - (a.teamsCount ?? 0);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '');
    } else {
      return (a.name || '').localeCompare(b.name || '');
    }
  });

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
        onSortChange={setSortBy}
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
    </Box>
  );
};

export default Coaches;
