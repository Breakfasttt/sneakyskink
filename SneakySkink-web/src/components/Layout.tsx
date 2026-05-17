import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  EmojiEvents as TrophyIcon,
  Search as SearchIcon,
  CloudSync as SyncIcon,
  OnlinePrediction as OnlineIcon,
  Layers as QueueIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [queueCount, setQueueCount] = useState<number>(0);
  const [apiOnline, setApiOnline] = useState<boolean>(true);

  // Poll the sync queue status every 10 seconds to show in the header badge
  useEffect(() => {
    const fetchQueueStatus = async () => {
      try {
        const res = await axios.get('http://localhost:3001/sync/queue');
        const active = res.data?.active || 0;
        const waiting = res.data?.waiting || 0;
        setQueueCount(active + waiting);
        setApiOnline(true);
      } catch (err) {
        console.error('API is offline or unreachable', err);
        setApiOnline(false);
      }
    };

    fetchQueueStatus();
    const interval = setInterval(fetchQueueStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Determine current active navigation index
  const getNavIndex = () => {
    const path = location.pathname;
    if (path.startsWith('/leagues') || path.startsWith('/competitions')) return 1;
    if (path.startsWith('/search') || path.startsWith('/coaches') || path.startsWith('/teams')) return 2;
    if (path.startsWith('/sync')) return 3;
    return 0; // default to dashboard
  };

  const navIndex = getNavIndex();

  const handleNavChange = (index: number) => {
    switch (index) {
      case 0:
        navigate('/');
        break;
      case 1:
        navigate('/leagues');
        break;
      case 2:
        navigate('/search');
        break;
      case 3:
        navigate('/sync');
        break;
      default:
        navigate('/');
    }
  };

  const navigationItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { label: 'Ligues', icon: <TrophyIcon />, path: '/leagues' },
    { label: 'Recherche', icon: <SearchIcon />, path: '/search' },
    {
      label: 'Synchro',
      icon: (
        <Badge badgeContent={queueCount} color="error" overlap="circular">
          <SyncIcon />
        </Badge>
      ),
      path: '/sync',
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
            <Paper
              elevation={0}
              sx={{
                px: 1,
                py: 0.25,
                bgcolor: 'rgba(0, 230, 118, 0.1)',
                border: '1px solid rgba(0, 230, 118, 0.3)',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: apiOnline ? '#00E676' : '#FF3D00',
                  boxShadow: apiOnline ? '0 0 8px #00E676' : '0 0 8px #FF3D00',
                }}
              />
              <Typography variant="caption" sx={{ color: apiOnline ? '#00E676' : '#FF3D00', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {apiOnline ? 'Online' : 'Offline'}
              </Typography>
            </Paper>
          </Box>

          {/* Desktop Navigation Links */}
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {navigationItems.map((item, idx) => (
                <Button
                  key={item.label}
                  onClick={() => handleNavChange(idx)}
                  variant={navIndex === idx ? 'contained' : 'text'}
                  color={navIndex === idx ? 'primary' : 'inherit'}
                  startIcon={item.icon}
                  sx={{
                    borderRadius: 3,
                    px: 2,
                    py: 1,
                    color: navIndex === idx ? '#0F172A' : '#94A3B8',
                    fontWeight: 700,
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>
          )}

          {/* Small Queue Indicator for Mobile */}
          {isMobile && queueCount > 0 && (
            <IconButton onClick={() => navigate('/sync')} size="small" sx={{ bgcolor: 'rgba(255, 61, 0, 0.15)', color: '#FF3D00' }}>
              <Badge badgeContent={queueCount} color="error">
                <QueueIcon size="small" />
              </Badge>
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 4 }, maxWidth: '1200px', width: '100%', mx: 'auto', boxSizing: 'border-box' }}>
        {children}
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
