/**
 * Page de recherche et d'affichage de la liste des coachs.
 * Permet de rechercher des coachs par leur nom et de demander
 * l'importation d'un coach inexistant via son ID Cyanide.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  InputBase,
  CircularProgress,
  alpha,
  IconButton,
  Avatar,
  Button,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as CoachIcon,
  ArrowForward as ArrowIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import { api } from '../api';

const Coaches: React.FC = () => {
  const navigate = useNavigate();
  const [coaches, setCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCoaches = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const res: any = await api.getCoaches({ search: search || undefined, limit: 40 });
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

      {loading && coaches.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: '#00E676' }} />
        </Box>
      ) : coaches.length === 0 ? (
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
      ) : (
        <Grid container spacing={2}>
          {coaches.map((coach) => (
            <Grid item xs={12} sm={6} md={4} key={coach.id}>
              <Paper
                onClick={() => navigate(`/coach/${coach.id}`)}
                elevation={0}
                sx={{
                  p: 2,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: 'rgba(0,230,118,0.06)',
                      border: '1px solid rgba(0,230,118,0.15)',
                      color: '#00E676',
                      fontWeight: 800,
                      fontSize: '1rem',
                    }}
                  >
                    {coach.name ? coach.name.charAt(0).toUpperCase() : '?'}
                  </Avatar>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {coach.name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25, color: '#64748B' }}>
                      <PublicIcon sx={{ fontSize: 12 }} />
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {coach.country || 'Inconnu'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <IconButton
                  sx={{
                    color: '#334155',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(148,163,184,0.06)',
                    borderRadius: 2,
                    p: 0.75,
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
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default Coaches;
