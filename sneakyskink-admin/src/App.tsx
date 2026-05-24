/**
 * Application d'administration SneakySkink.
 * Gère la file d'attente, les ligues et la maintenance de la BDD.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  FormControlLabel,
  Checkbox,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  CircularProgress,
  Divider,
  Alert,
  Snackbar,
  Stack,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TableSortLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Refresh,
  Speed,
  Settings,
  CloudSync,
  Layers,
  CheckCircle,
  ErrorOutlined,
  Lock,
  Search,
  Check,
  Build,
  CleaningServices
} from '@mui/icons-material';

import {
  getSavedAdminKey,
  saveAdminKey,
  removeAdminKey,
  getApiClient
} from './api.js';

interface AuditReport {
  id: string;
  createdAt: string;
  trigger: string;
  status: string;
  durationMs: number;
  duplicatesFound: number;
  duplicatesFixed: number;
  incompleteFound: number;
  incompleteFixed: number;
  mismatchedFound: number;
  mismatchedFixed: number;
}

export default function App() {
  // Authentication & Configuration
  const [adminKey, setAdminKey] = useState<string>(getSavedAdminKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [saveToLocal, setSaveToLocal] = useState<boolean>(!!getSavedAdminKey());
  const [isValidKey, setIsValidKey] = useState<boolean | null>(null);
  const [checkingKey, setCheckingKey] = useState<boolean>(false);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<number>(0);

  // Data states
  const [apiStats, setApiStats] = useState<any>(null);
  const [queueState, setQueueState] = useState<any>(null);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [auditReports, setAuditReports] = useState<AuditReport[]>([]);

  // Local Leagues Search & Sorting
  const [dbSearchInput, setDbSearchInput] = useState<string>('');
  const [dbSearchQuery, setDbSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleRequestSort = (property: string) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };
  
  // Loading states
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(false);
  const [loadingLeagues, setLoadingLeagues] = useState<boolean>(false);
  const [loadingReports, setLoadingReports] = useState<boolean>(false);
  const [maintenanceRunning, setMaintenanceRunning] = useState<boolean>(false);
  const [queueCleaning, setQueueCleaning] = useState<boolean>(false);
  const [pacingUpdating, setPacingUpdating] = useState<boolean>(false);
  
  // Cyanide Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingCyanide, setSearchingCyanide] = useState<boolean>(false);

  // Notifications
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Confirmation dialogs
  const [openCleanDialog, setOpenCleanDialog] = useState<boolean>(false);

  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setToast({ open: true, message, severity });
  }, []);

  // Fetch stats & validation check
  const fetchStats = useCallback(async (keyToCheck = adminKey) => {
    setCheckingKey(true);
    setLoadingStats(true);
    try {
      const client = getApiClient(keyToCheck);
      const data = await client.getStatus();
      setApiStats(data);
      setIsValidKey(true);
      if (saveToLocal) {
        saveAdminKey(keyToCheck);
      } else {
        removeAdminKey();
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) {
        setIsValidKey(false);
        showToast("Clé d'administration invalide.", "error");
      } else {
        setIsValidKey(null);
        showToast(`Erreur de connexion à l'API : ${err.message}`, "error");
      }
    } finally {
      setCheckingKey(false);
      setLoadingStats(false);
    }
  }, [adminKey, saveToLocal, showToast]);

  // Fetch queue status
  const fetchQueue = useCallback(async () => {
    if (!isValidKey) return;
    setLoadingQueue(true);
    try {
      const client = getApiClient();
      const state = await client.getSyncQueue();
      setQueueState(state);
    } catch (err: any) {
      console.error(err);
      showToast(`Erreur file d'attente : ${err.message}`, "error");
    } finally {
      setLoadingQueue(false);
    }
  }, [isValidKey, showToast]);

  // Fetch leagues
  const fetchLeagues = useCallback(async () => {
    if (!isValidKey) return;
    setLoadingLeagues(true);
    try {
      const client = getApiClient();
      const activeParam = statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined;
      // Récupérer toutes les ligues (actives et inactives) avec filtres et tri
      const data = await client.getLeagues({
        limit: 100,
        search: dbSearchQuery || undefined,
        active: activeParam,
        sortBy,
        sortOrder
      });
      setLeagues(data);
    } catch (err: any) {
      console.error(err);
      showToast(`Erreur ligues : ${err.message}`, "error");
    } finally {
      setLoadingLeagues(false);
    }
  }, [isValidKey, showToast, dbSearchQuery, sortBy, sortOrder, statusFilter]);

  // Fetch audit reports
  const fetchReports = useCallback(async () => {
    if (!isValidKey) return;
    setLoadingReports(true);
    try {
      const client = getApiClient();
      const reports = await client.getAuditReports();
      setAuditReports(reports || []);
    } catch (err: any) {
      console.error(err);
      showToast(`Erreur rapports d'audit : ${err.message}`, "error");
    } finally {
      setLoadingReports(false);
    }
  }, [isValidKey, showToast]);

  // Handle connection check
  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(adminKey);
  };

  // Toggle league active status (activé/désactivé une ligue)
  const handleToggleActive = async (leagueId: string, currentActive: boolean) => {
    // Mise à jour optimiste locale pour éviter le clignotement
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: !currentActive } : l));
    try {
      const client = getApiClient();
      await client.toggleLeagueActive(leagueId, !currentActive);
      showToast(`Statut de la ligue mis à jour avec succès.`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Échec du changement de statut : ${err.message}`, "error");
      // Annulation en cas d'erreur
      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, active: currentActive } : l));
    }
  };

  // Toggle league priority
  const handleTogglePriority = async (leagueId: string, currentPriority: boolean) => {
    // Mise à jour optimiste locale pour éviter le clignotement
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, isPriority: !currentPriority } : l));
    try {
      const client = getApiClient();
      await client.setLeaguePriority(leagueId, !currentPriority);
      showToast(`Priorité de la ligue mise à jour.`, "success");
    } catch (err: any) {
      console.error(err);
      showToast(`Échec du changement de priorité : ${err.message}`, "error");
      // Annulation en cas d'erreur
      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, isPriority: currentPriority } : l));
    }
  };

  // Trigger sync league
  const handleSyncLeague = async (leagueId: string) => {
    try {
      const client = getApiClient();
      const res = await client.syncLeague(leagueId);
      showToast(res.message || `Synchronisation de la ligue planifiée.`, "success");
      fetchQueue();
      fetchLeagues();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec : ${err.message}`, "error");
    }
  };

  // Clean queue
  const handleCleanQueue = async () => {
    setQueueCleaning(true);
    setOpenCleanDialog(false);
    try {
      const client = getApiClient();
      const res = await client.cleanSyncQueue();
      showToast(`File d'attente purgée avec succès (${res.cleanedCompleted} jobs terminés et ${res.cleanedFailed} jobs échoués nettoyés).`, "success");
      fetchQueue();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec de purge : ${err.message}`, "error");
    } finally {
      setQueueCleaning(false);
    }
  };

  const [forcingHealthCheck, setForcingHealthCheck] = useState<boolean>(false);

  const handleForceHealthCheck = async () => {
    setForcingHealthCheck(true);
    try {
      const client = getApiClient();
      const res = await client.forceHealthCheck();
      showToast(res.message || "Vérification de santé demandée avec succès.", "success");
      fetchQueue();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec : ${err.message}`, "error");
    } finally {
      setForcingHealthCheck(false);
    }
  };

  // Run database maintenance
  const handleRunMaintenance = async () => {
    setMaintenanceRunning(true);
    try {
      const client = getApiClient();
      const res = await client.runMaintenance();
      showToast(`Audit et maintenance terminés en ${res.report?.durationMs || 0}ms.`, "success");
      fetchReports();
      fetchStats();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec de l'audit : ${err.message}`, "error");
    } finally {
      setMaintenanceRunning(false);
    }
  };

  // Bypass rate pacing
  const handleBypassPacing = async () => {
    setPacingUpdating(true);
    try {
      const client = getApiClient();
      await client.bypassPacing();
      showToast("Rate pacing désactivé temporairement.", "warning");
      fetchQueue();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec de configuration : ${err.message}`, "error");
    } finally {
      setPacingUpdating(false);
    }
  };

  // Restore rate pacing
  const handleRestorePacing = async () => {
    setPacingUpdating(true);
    try {
      const client = getApiClient();
      await client.restorePacing();
      showToast("Rate pacing restauré.", "success");
      fetchQueue();
    } catch (err: any) {
      console.error(err);
      showToast(`Échec de configuration : ${err.message}`, "error");
    } finally {
      setPacingUpdating(false);
    }
  };

  // Search Cyanide Leagues
  const handleSearchCyanide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchingCyanide(true);
    setSearchResults([]);
    try {
      const client = getApiClient();
      const res = await client.searchCyanideLeagues(searchQuery);
      setSearchResults(res || []);
      if (res?.length === 0) {
        showToast("Aucune ligue correspondante trouvée sur Cyanide.", "info");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Recherche Cyanide : ${err.message}`, "error");
    } finally {
      setSearchingCyanide(false);
    }
  };

  // Trigger check on load if key is saved
  useEffect(() => {
    if (adminKey) {
      fetchStats(adminKey);
    }
  }, []);

  // Periodic polling for queue and stats
  useEffect(() => {
    if (!isValidKey) return;
    fetchQueue();
    const interval = setInterval(() => {
      fetchQueue();
    }, 5000);
    return () => clearInterval(interval);
  }, [isValidKey, fetchQueue]);

  // Load appropriate data when tab changes
  useEffect(() => {
    if (!isValidKey) return;
    if (activeTab === 0) {
      fetchQueue();
    } else if (activeTab === 1) {
      fetchLeagues();
    } else if (activeTab === 2) {
      fetchReports();
    }
  }, [activeTab, isValidKey, fetchQueue, fetchLeagues, fetchReports]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, gap: 2 }}>
        <Typography variant="h3" component="h1" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 800 }}>
          🦎 SneakySkink <Box component="span" sx={{ color: 'text.primary', fontWeight: 300 }}>Admin</Box>
        </Typography>
        <Chip label="v1.0.0" color="primary" variant="outlined" size="small" sx={{ borderColor: 'rgba(0, 230, 118, 0.3)' }} />
      </Box>

      {/* Auth Card */}
      <Card sx={{ mb: 4, position: 'relative', overflow: 'visible' }}>
        <Box
          sx={{
            position: 'absolute',
            top: -1,
            left: 20,
            right: 20,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #00E676, transparent)',
          }}
        />
        <CardContent>
          <form onSubmit={handleConnect}>
            <Grid container spacing={3} sx={{ alignItems: 'center' }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Clé d'administration API"
                  type={showKey ? 'text' : 'password'}
                  value={adminKey}
                  onChange={(e: any) => setAdminKey(e.target.value)}
                  disabled={checkingKey || loadingStats}
                  placeholder="Saisissez la clé d'administration"
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={() => setShowKey(!showKey)} edge="end">
                            {showKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={saveToLocal}
                      onChange={(e: any) => setSaveToLocal(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Sauvegarder dans le navigateur"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  type="submit"
                  disabled={checkingKey || loadingStats}
                  startIcon={(checkingKey || loadingStats) ? <CircularProgress size={20} color="inherit" /> : <Check />}
                  sx={{ height: 56 }}
                >
                  Connexion
                </Button>
              </Grid>
            </Grid>
          </form>

          {isValidKey !== null && (
            <Alert
              severity={isValidKey ? 'success' : 'error'}
              icon={isValidKey ? <CheckCircle /> : <ErrorOutlined />}
              sx={{ mt: 2 }}
            >
              {isValidKey
                ? "Connexion établie avec succès avec l'API REST. Les endpoints d'administration sont débloqués."
                : "La clé d'administration fournie est incorrecte. Les accès restent restreints."}
            </Alert>
          )}
        </CardContent>
      </Card>

      {isValidKey && (
        <>
          {/* Quick Stats Grid */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Ligues</Typography>
                  <Typography variant="h4" color="primary.main">{apiStats?.stats?.leagues ?? '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Compétitions</Typography>
                  <Typography variant="h4" color="primary.main">{apiStats?.stats?.competitions ?? '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Équipes</Typography>
                  <Typography variant="h4" color="primary.main">{apiStats?.stats?.teams ?? '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Coachs</Typography>
                  <Typography variant="h4" color="primary.main">{apiStats?.stats?.coaches ?? '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Card sx={{ textAlign: 'center', py: 1 }}>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">Matchs persistés</Typography>
                  <Typography variant="h4" color="primary.main">{apiStats?.stats?.matches ?? '-'}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Navigation Tabs */}
          <Paper sx={{ mb: 4, borderRadius: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_: any, val: any) => setActiveTab(val)}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab icon={<CloudSync />} label="File d'attente & Pacing" />
              <Tab icon={<Layers />} label="Gestion des Ligues" />
              <Tab icon={<Settings />} label="Maintenance & Audits" />
            </Tabs>
          </Paper>

          {/* Tab 0: Queue & Pacing */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Queue Status */}
              <Grid size={{ xs: 12, md: 7 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    title="File d'attente BullMQ (Redis)"
                    action={
                      <IconButton onClick={fetchQueue} disabled={loadingQueue}>
                        <Refresh />
                      </IconButton>
                    }
                  />
                  <CardContent>
                    {queueState ? (
                      <Stack spacing={3}>
                        <Grid container spacing={2}>
                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary">En cours</Typography>
                              <Typography variant="h4" color="info.main">{queueState.counts?.active ?? 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary">En attente</Typography>
                              <Typography variant="h4" color="warning.main">{queueState.counts?.waiting ?? 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 4 }}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary">Différé</Typography>
                              <Typography variant="h4" color="text.secondary">{queueState.counts?.delayed ?? 0}</Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Grid container spacing={2}>
                          <Grid size={{ xs: 6 }}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary">Terminés</Typography>
                              <Typography variant="h5" color="success.main">{queueState.counts?.completed ?? 0}</Typography>
                            </Box>
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, textAlign: 'center' }}>
                              <Typography variant="subtitle2" color="text.secondary">Échoués</Typography>
                              <Typography variant="h5" color="secondary.main">{queueState.counts?.failed ?? 0}</Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        <Divider />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            État Harvester : <strong>{queueState.harvesterRunning ? 'ACTIF 🟢' : 'ARRÊTÉ 🔴'}</strong>
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Statut Cyanide API : <strong>{queueState.cyanideStatus ?? 'INCONNU'}</strong>
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="outlined"
                            color="primary"
                            startIcon={forcingHealthCheck ? <CircularProgress size={20} color="inherit" /> : <CloudSync />}
                            onClick={handleForceHealthCheck}
                            disabled={forcingHealthCheck}
                            sx={{ flex: 1 }}
                          >
                            Tenter remise en route
                          </Button>
                          <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<CleaningServices />}
                            onClick={() => setOpenCleanDialog(true)}
                            disabled={queueCleaning}
                            sx={{ flex: 1 }}
                          >
                            Purger l'historique
                          </Button>
                        </Box>
                      </Stack>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Rate Pacing */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader title="Contrôle de Vitesse (Rate Pacing)" />
                  <CardContent>
                    <Stack spacing={3}>
                      <Alert severity={queueState?.pacingBypassed ? "warning" : "success"}>
                        {queueState?.pacingBypassed
                          ? "Le pacing est court-circuité (DANGER : pas de délai entre les requêtes)."
                          : "Le pacing est actif. Un délai de 2,5s est injecté entre chaque appel API."}
                      </Alert>
                      
                      <Typography variant="body2" color="text.secondary">
                        Pour des opérations de maintenance massives ou du débogage local sur des bases de test, vous pouvez forcer le Harvester à ignorer temporairement le délai imposé by l'API officielle de Cyanide.
                      </Typography>

                      <Typography variant="caption" color="secondary.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorOutlined fontSize="small" /> 
                        Attention : Désactiver le pacing augmente les risques d'erreur HTTP 429.
                      </Typography>

                      <Box sx={{ display: 'flex', gap: 2, pt: 2 }}>
                        <Button
                          variant="contained"
                          color="secondary"
                          startIcon={<Speed />}
                          onClick={handleBypassPacing}
                          disabled={pacingUpdating || queueState?.pacingBypassed === true}
                          fullWidth
                        >
                          Bypass Pacing
                        </Button>
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<CheckCircle />}
                          onClick={handleRestorePacing}
                          disabled={pacingUpdating || queueState?.pacingBypassed === false}
                          fullWidth
                        >
                          Restaurer Pacing
                        </Button>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Tab 1: Leagues Management */}
          {activeTab === 1 && (
            <Stack spacing={4}>
              {/* Import / Search League */}
              <Card>
                <CardHeader title="Importer une nouvelle ligue (Cyanide)" />
                <CardContent>
                  <form onSubmit={handleSearchCyanide}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 9 }}>
                        <TextField
                          fullWidth
                          label="Nom de la Ligue"
                          value={searchQuery}
                          onChange={(e: any) => setSearchQuery(e.target.value)}
                          placeholder="Rechercher une ligue publique ou privée de BB3..."
                          slotProps={{
                            input: {
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton type="submit" disabled={searchingCyanide}>
                                    {searchingCyanide ? <CircularProgress size={20} /> : <Search />}
                                  </IconButton>
                                </InputAdornment>
                              )
                            }
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 3 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          type="submit"
                          disabled={searchingCyanide}
                          sx={{ height: 56 }}
                        >
                          Rechercher
                        </Button>
                      </Grid>
                    </Grid>
                  </form>

                  {searchResults.length > 0 && (
                    <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 300 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>Nom</TableCell>
                            <TableCell>ID Ligue (Cyanide)</TableCell>
                            <TableCell align="center">Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {searchResults.map((league) => (
                            <TableRow key={league.id}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600, display: 'inline' }}>
                                  {league.name}
                                </Typography>
                                {league.imported && (
                                  <Chip label="Déjà importée" size="small" color="success" sx={{ ml: 1, height: 20, fontSize: '0.75rem' }} />
                                )}
                              </TableCell>
                              <TableCell><code>{league.id}</code></TableCell>
                              <TableCell align="center">
                                <Button
                                  variant={league.imported ? "outlined" : "contained"}
                                  size="small"
                                  color={league.imported ? "secondary" : "primary"}
                                  startIcon={<CloudSync />}
                                  onClick={() => handleSyncLeague(league.id)}
                                >
                                  {league.imported ? "Forcer Synchro" : "Importer"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>

              {/* Local Leagues List */}
              <Card>
                <CardHeader
                  title="Ligues en Base de Données"
                  action={
                    <IconButton onClick={fetchLeagues} disabled={loadingLeagues}>
                      <Refresh />
                    </IconButton>
                  }
                />
                <CardContent>
                  {/* Formulaire de recherche locale en BDD */}
                  <Box
                    component="form"
                    onSubmit={(e: React.FormEvent) => {
                      e.preventDefault();
                      setDbSearchQuery(dbSearchInput);
                    }}
                    sx={{ display: 'flex', gap: 2, mb: 3 }}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Rechercher une ligue en base de données"
                      value={dbSearchInput}
                      onChange={(e: any) => setDbSearchInput(e.target.value)}
                      placeholder="Nom de la ligue..."
                      slotProps={{
                        input: {
                          endAdornment: dbSearchInput && (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setDbSearchInput('');
                                  setDbSearchQuery('');
                                }}
                              >
                                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>×</span>
                              </IconButton>
                            </InputAdornment>
                          )
                        }
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel id="status-filter-label">Statut</InputLabel>
                      <Select
                        labelId="status-filter-label"
                        id="status-filter"
                        value={statusFilter}
                        label="Statut"
                        onChange={(e: any) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">Toutes</MenuItem>
                        <MenuItem value="active">Actives</MenuItem>
                        <MenuItem value="inactive">Inactives</MenuItem>
                      </Select>
                    </FormControl>
                    <Button variant="contained" type="submit" startIcon={<Search />} sx={{ minWidth: 120 }}>
                      Filtrer
                    </Button>
                  </Box>

                  {loadingLeagues ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <TableSortLabel
                                active={sortBy === 'name'}
                                direction={sortBy === 'name' ? sortOrder : 'desc'}
                                onClick={() => handleRequestSort('name')}
                              >
                                Ligue
                              </TableSortLabel>
                            </TableCell>
                            <TableCell>ID Ligue</TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={sortBy === 'gamerCount'}
                                direction={sortBy === 'gamerCount' ? sortOrder : 'desc'}
                                onClick={() => handleRequestSort('gamerCount')}
                              >
                                Coachs
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={sortBy === 'matchesCount'}
                                direction={sortBy === 'matchesCount' ? sortOrder : 'desc'}
                                onClick={() => handleRequestSort('matchesCount')}
                              >
                                Matchs
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={sortBy === 'active'}
                                direction={sortBy === 'active' ? sortOrder : 'desc'}
                                onClick={() => handleRequestSort('active')}
                              >
                                Actif / Inactif
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">
                              <TableSortLabel
                                active={sortBy === 'isPriority'}
                                direction={sortBy === 'isPriority' ? sortOrder : 'desc'}
                                onClick={() => handleRequestSort('isPriority')}
                              >
                                Prioritaire
                              </TableSortLabel>
                            </TableCell>
                            <TableCell align="center">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {leagues.map((league) => (
                            <TableRow key={league.id}>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>{league.name}</Typography>
                              </TableCell>
                              <TableCell><code>{league.id}</code></TableCell>
                              <TableCell align="center">{league.gamerCount ?? 0}</TableCell>
                              <TableCell align="center">{league.matchesCount}</TableCell>
                              <TableCell align="center">
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={league.active}
                                      onChange={() => handleToggleActive(league.id, league.active)}
                                      color="primary"
                                    />
                                  }
                                  label={
                                    <Chip
                                      label={league.active ? 'Actif' : 'Inactif'}
                                      color={league.active ? 'success' : 'default'}
                                      size="small"
                                    />
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <FormControlLabel
                                  control={
                                    <Switch
                                      checked={league.isPriority || false}
                                      onChange={() => handleTogglePriority(league.id, league.isPriority || false)}
                                      color="secondary"
                                    />
                                  }
                                  label={
                                    <Chip
                                      label={league.isPriority ? 'Prioritaire' : 'Standard'}
                                      color={league.isPriority ? 'secondary' : 'default'}
                                      size="small"
                                    />
                                  }
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="primary"
                                  startIcon={<CloudSync />}
                                  onClick={() => handleSyncLeague(league.id)}
                                >
                                  Forcer Synchro
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {leagues.length === 0 && (
                            <TableRow>
                              <TableCell {...{ colSpan: 7 }} align="center">
                                Aucune ligue enregistrée en base de données localement.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </CardContent>
              </Card>
            </Stack>
          )}

          {/* Tab 2: Maintenance & Audits */}
          {activeTab === 2 && (
            <Grid container spacing={3}>
              {/* Trigger Card */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader title="Maintenance de la Base de Données" />
                  <CardContent>
                    <Stack spacing={3}>
                      <Typography variant="body2" color="text.secondary">
                        L'opération d'audit et de maintenance nettoie la base de données PostgreSQL en :
                      </Typography>
                      <Typography variant="body2" component="div">
                        <ul>
                          <li>Dédupliquant les matchs importés par erreur</li>
                          <li>Recalculant les statistiques agrégées</li>
                          <li>Identifiant les anomalies de score et de forfeits</li>
                          <li>Mettant à jour l'effectif des joueurs en fonction de leur statut actuel (Retraité, décédé)</li>
                        </ul>
                      </Typography>

                      <Button
                        variant="contained"
                        color="secondary"
                        size="large"
                        startIcon={maintenanceRunning ? <CircularProgress size={20} color="inherit" /> : <Build />}
                        onClick={handleRunMaintenance}
                        disabled={maintenanceRunning}
                        fullWidth
                      >
                        Lancer l'audit de la BDD
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* History Card */}
              <Grid size={{ xs: 12, md: 8 }}>
                <Card sx={{ height: '100%' }}>
                  <CardHeader
                    title="Historique des Audits"
                    action={
                      <IconButton onClick={fetchReports} disabled={loadingReports}>
                        <Refresh />
                      </IconButton>
                    }
                  />
                  <CardContent>
                    {loadingReports ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : (
                      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Date</TableCell>
                              <TableCell>Statut</TableCell>
                              <TableCell>Durée</TableCell>
                              <TableCell align="center">Doublons résolus</TableCell>
                              <TableCell align="center">Incohérences résolues</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {auditReports.map((report) => (
                              <TableRow key={report.id}>
                                <TableCell>
                                  {new Date(report.createdAt).toLocaleString('fr-FR')}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={report.status}
                                    color={report.status === 'SUCCESS' ? 'success' : 'error'}
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>{report.durationMs}ms</TableCell>
                                <TableCell align="center">
                                  <strong>{report.duplicatesFixed}</strong> / {report.duplicatesFound}
                                </TableCell>
                                <TableCell align="center">
                                  <strong>{report.incompleteFixed}</strong> / {report.incompleteFound}
                                </TableCell>
                              </TableRow>
                            ))}
                            {auditReports.length === 0 && (
                              <TableRow>
                                <TableCell {...{ colSpan: 5 }} align="center">
                                  Aucun rapport d'audit enregistré.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </>
      )}

      {/* Clean Queue Confirmation Dialog */}
      <Dialog open={openCleanDialog} onClose={() => setOpenCleanDialog(false)}>
        <DialogTitle>Confirmer la purge de la file d'attente</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer tous les jobs terminés et échoués de la file d'attente Redis ? Les jobs en cours d'exécution et en attente ne seront pas affectés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCleanDialog(false)} color="inherit">Annuler</Button>
          <Button onClick={handleCleanQueue} color="secondary" autoFocus>Confirmer la purge</Button>
        </DialogActions>
      </Dialog>

      {/* Global Snackbar Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
