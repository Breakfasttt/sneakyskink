import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useMediaQuery,
  useTheme,
  Button,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EmojiEvents as TrophyIcon,
  Search as SearchIcon,
  CloudSync as SyncIcon,
  OnlinePrediction as OnlineIcon,
  Layers as QueueIcon,
} from '@mui/icons-material';
import { api } from '../api';

export const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [queueCount, setQueueCount] = useState<number>(0);
  const [harvesterRunning, setHarvesterRunning] = useState<boolean>(true);
  const [cyanideOnline, setCyanideOnline] = useState<boolean>(true);

  // Poll the sync queue status every 10 seconds to show in the header badge
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const data = await api.getSyncQueue();
        const active = data.active || 0;
        const waiting = data.waiting || 0;
        setQueueCount(active + waiting);
        setHarvesterRunning((data as any).harvesterRunning ?? false);
        setCyanideOnline((data as any).cyanideOnline ?? false);
      } catch (err) {
        console.error('API is offline or unreachable', err);
        setHarvesterRunning(false);
        setCyanideOnline(false);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Determine current active navigation index
  const getNavIndex = () => {
    const path = location.pathname;
    if (path.startsWith('/ligues') || path.startsWith('/competitions')) return 1;
    if (path.startsWith('/search') || path.startsWith('/coach')) return 2;
    if (path.startsWith('/synchro')) return 3;
    return 0; // default to dashboard
  };

  const navIndex = getNavIndex();

  const handleNavChange = (index: number) => {
    switch (index) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/ligues');
        break;
      case 2:
        navigate('/search');
        break;
      case 3:
        navigate('/synchro');
        break;
      default:
        navigate('/');
    }
  };

  const navigationItems = [
    { label: 'Accueil', icon: <DashboardIcon />, path: '/' },
    { label: 'Ligues', icon: <TrophyIcon />, path: '/ligues' },
    { label: 'Recherche', icon: <SearchIcon />, path: '/search' },
    {
      label: 'Synchro',
      icon: (
        <Badge badgeContent={queueCount} color="error" overlap="circular">
          <SyncIcon />
        </Badge>
      ),
      path: '/synchro',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', pb: isMobile ? 8 : 0 }}>
      {/* Top Navbar */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', bgcolor: '#0B0F19' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }} onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <Typography variant="h5" component="div" sx={{ fontFamily: 'Outfit', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span style={{ color: '#00E676' }}>🦎</span> SNEAKY<span style={{ color: '#00E676' }}>SKINK</span>
            </Typography>
          </Box>

          {/* Discreet Status Indicators (top right) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Tooltip title={`Harvester Daemon: ${harvesterRunning ? 'Actif' : 'Hors ligne'}`}>
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: harvesterRunning ? 'rgba(0, 230, 118, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: harvesterRunning ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: harvesterRunning ? '#00E676' : '#EF4444',
                    boxShadow: harvesterRunning ? '0 0 6px #00E676' : '0 0 6px #EF4444',
                    '@keyframes pulse': {
                      '0%': { opacity: 0.4 },
                      '50%': { opacity: 1 },
                      '100%': { opacity: 0.4 },
                    },
                    animation: harvesterRunning ? 'pulse 2s infinite ease-in-out' : 'none',
                  }}
                />
                <Typography variant="caption" sx={{ color: harvesterRunning ? '#00E676' : '#EF4444', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  HARVESTER
                </Typography>
              </Paper>
            </Tooltip>

            <Tooltip title={`API Cyanide: ${cyanideOnline ? 'Disponible' : 'Indisponible'}`}>
              <Paper
                elevation={0}
                sx={{
                  px: 1.5,
                  py: 0.5,
                  bgcolor: cyanideOnline ? 'rgba(0, 230, 118, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                  border: cyanideOnline ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    bgcolor: cyanideOnline ? '#00E676' : '#EF4444',
                    boxShadow: cyanideOnline ? '0 0 6px #00E676' : '0 0 6px #EF4444',
                  }}
                />
                <Typography variant="caption" sx={{ color: cyanideOnline ? '#00E676' : '#EF4444', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '0.05em' }}>
                  CYANIDE
                </Typography>
              </Paper>
            </Tooltip>
          </Box>

          {/* Small Queue Indicator for Mobile */}
          {isMobile && queueCount > 0 && (
            <IconButton onClick={() => navigate('/synchro')} size="small" sx={{ bgcolor: 'rgba(255, 61, 0, 0.15)', color: '#FF3D00' }}>
              <Badge badgeContent={queueCount} color="error">
                <QueueIcon fontSize="small" />
              </Badge>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: '1200px', width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
        <Outlet />
      </Box>

      {/* Bottom Navigation for Mobile Devices */}
      {isMobile && (
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000 }} elevation={10}>
          <BottomNavigation
            showLabels
            value={navIndex}
            onChange={(_, newValue) => handleNavChange(newValue)}
            sx={{ bgcolor: '#151D30', borderTop: '1px solid rgba(148, 163, 184, 0.08)', height: 64 }}
          >
            {navigationItems.map((item) => (
              <BottomNavigationAction
                key={item.label}
                label={item.label}
                icon={item.icon}
                sx={{
                  color: '#94A3B8',
                  '&.Mui-selected': {
                    color: '#00E676',
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};
