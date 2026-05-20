import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  InputBase,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Divider,
  Skeleton,
  alpha,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
  EmojiEvents as LeagueIcon,
  SportsSoccer as CompetitionIcon,
  Person as CoachIcon,
  Group as TeamIcon,
  ArrowForward as ArrowIcon,
  CloudSync as SyncIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { WidgetMatchsParHeure } from '../components/widgets';

// ─── Inline Styles ────────────────────────────────────────────────────────────
const glow = (color: string) => `0 0 24px ${alpha(color, 0.25)}`;


// ─── Stat Card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  value: number | null;
  label: string;
  icon: React.ReactNode;
  accent: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, icon, accent, onClick }) => (
  <Box
    onClick={onClick}
    sx={{
      flex: 1,
      minWidth: 0,
      p: 2,
      cursor: onClick ? 'pointer' : 'default',
      borderRadius: 2.5,
      border: `1px solid ${alpha(accent, 0.18)}`,
      background: `linear-gradient(135deg, ${alpha(accent, 0.07)} 0%, ${alpha(accent, 0.03)} 100%)`,
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 0.5,
      transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: accent,
        opacity: 0.6,
      },
      '&:hover': onClick ? {
        border: `1px solid ${alpha(accent, 0.45)}`,
        transform: 'translateY(-3px)',
        boxShadow: glow(accent),
      } : {},
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: accent }}>
      {icon}
      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.58rem' }}>
        {label}
      </Typography>
    </Box>
    {value === null ? (
      <Skeleton variant="text" width={48} height={34} sx={{ bgcolor: 'rgba(255,255,255,0.06)' }} />
    ) : (
      <Typography sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#F8FAFC', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value.toLocaleString('fr-FR')}
      </Typography>
    )}
  </Box>
);

// ─── Home ──────────────────────────────────────────────────────────────────────
const Home: React.FC = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stats, setStats] = useState<{ leagues: number | null; competitions: number | null; coaches: number | null }>({
    leagues: null, competitions: null, coaches: null,
  });
  const [recentMatches, setRecentMatches] = useState<{ startedAt: string }[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    api.getStatus().then((data: any) => {
      const statsObj = data?.stats || data;
      setStats({
        leagues: statsObj?.leagues ?? null,
        competitions: statsObj?.competitions ?? null,
        coaches: statsObj?.coaches ?? null
      });
    }).catch(() => {});

    api.getGlobalStats().then((res: any) => {
      const payload = res?.data || res || {};
      const matches = payload?.matches || [];
      setRecentMatches(matches);
    }).catch(() => setRecentMatches([])).finally(() => setActivityLoading(false));
  }, []);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [leaguesRes, coachesRes] = await Promise.all([
          api.getLeagues(),
          api.getCoaches({ search: value, limit: 3 }),
        ]);

        const leaguesList = leaguesRes.data || leaguesRes || [];
        const coachesList = coachesRes.data || coachesRes || [];

        const filteredLeagues = (Array.isArray(leaguesList) ? leaguesList : [])
          .filter((x: any) => x.name?.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 3);

        const filteredCoaches = Array.isArray(coachesList) ? coachesList : [];

        const results: any[] = [
          ...filteredLeagues.map((l: any) => ({ type: 'league', id: l.id, label: l.name, sub: 'Ligue' })),
          ...filteredCoaches.map((c: any) => ({ type: 'coach', id: c.id, label: c.name, sub: 'Coach' })),
        ];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleSuggestionClick = (item: any) => {
    setShowSuggestions(false); setQuery('');
    if (item.type === 'league') navigate(`/ligue/${item.id}`);
    else if (item.type === 'coach') navigate(`/coach/${item.id}`);
    else if (item.type === 'competition') navigate(`/competition/${item.id}`);
    else if (item.type === 'team') navigate(`/equipe/${item.id}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const typeIcon: Record<string, React.ReactNode> = {
    league: <LeagueIcon fontSize="small" sx={{ color: '#F59E0B' }} />,
    competition: <CompetitionIcon fontSize="small" sx={{ color: '#3B82F6' }} />,
    coach: <CoachIcon fontSize="small" sx={{ color: '#00E676' }} />,
    team: <TeamIcon fontSize="small" sx={{ color: '#A855F7' }} />,
  };

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <Box
        sx={{
          position: 'relative',
          textAlign: 'center',
          pt: { xs: 4, md: 6 },
          pb: { xs: 4, md: 5 },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '300px',
            background: 'radial-gradient(ellipse, rgba(0,230,118,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          },
        }}
      >


        <Typography
          component="h1"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '2rem', md: '3rem' },
            letterSpacing: '-0.04em',
            lineHeight: 1.1,
            mb: 1.5,
            background: 'linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Statistiques Blood Bowl
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748B', mb: 4, fontSize: '1rem' }}>
          Coachs · Ligues · Compétitions · Matchs
        </Typography>

        {/* Search */}
        <Box ref={searchRef} sx={{ position: 'relative', maxWidth: 580, mx: 'auto' }}>
          <Paper
            component="form"
            onSubmit={handleSearchSubmit}
            elevation={0}
            sx={{
              display: 'flex',
              alignItems: 'center',
              px: 2.5,
              py: 1.25,
              borderRadius: 99,
              border: '1px solid rgba(148,163,184,0.12)',
              bgcolor: 'rgba(21,29,48,0.8)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              '&:focus-within': {
                border: '1px solid rgba(0,230,118,0.5)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 4px rgba(0,230,118,0.08)',
              },
              transition: 'all 0.2s',
            }}
          >
            {searching
              ? <CircularProgress size={18} sx={{ color: '#00E676', mr: 1.5, flexShrink: 0 }} />
              : <SearchIcon sx={{ color: '#475569', mr: 1.5, flexShrink: 0 }} />
            }
            <InputBase
              fullWidth
              placeholder="Chercher un coach, une ligue, une équipe..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              sx={{ fontSize: '0.95rem', color: '#F8FAFC', '& input::placeholder': { color: '#475569' } }}
              inputProps={{ 'aria-label': 'Recherche globale' }}
            />
          </Paper>

          {/* Suggestions */}
          {showSuggestions && (
            <Paper
              elevation={0}
              sx={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                right: 0,
                zIndex: 1300,
                border: '1px solid rgba(148,163,184,0.12)',
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: '#0F172A',
                boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
              }}
            >
              <List dense disablePadding>
                {suggestions.map((item, i) => (
                  <React.Fragment key={`${item.type}-${item.id}`}>
                    {i > 0 && <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />}
                    <ListItemButton
                      onClick={() => handleSuggestionClick(item)}
                      sx={{ py: 1.5, px: 2, '&:hover': { bgcolor: 'rgba(0,230,118,0.05)' } }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>{typeIcon[item.type]}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        secondary={item.sub}
                        primaryTypographyProps={{ fontWeight: 600, fontSize: '0.875rem', color: '#F8FAFC' }}
                        secondaryTypographyProps={{ fontSize: '0.7rem', color: '#64748B' }}
                      />
                      <ArrowIcon sx={{ color: '#1E293B', fontSize: 16 }} />
                    </ListItemButton>
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      </Box>

      {/* ── Stat Cards ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: { xs: 1.5, sm: 2 }, flexWrap: 'wrap', mb: 3 }}>
        <StatCard value={stats.leagues} label="Ligues" icon={<LeagueIcon sx={{ fontSize: 15 }} />} accent="#F59E0B" onClick={() => navigate('/ligues')} />
        <StatCard value={stats.competitions} label="Compétitions" icon={<CompetitionIcon sx={{ fontSize: 15 }} />} accent="#3B82F6" onClick={() => navigate('/competitions')} />
        <StatCard value={stats.coaches} label="Coachs" icon={<CoachIcon sx={{ fontSize: 15 }} />} accent="#00E676" onClick={() => navigate('/coachs')} />
        {/* Synchro CTA */}
        <Box
          onClick={() => navigate('/synchro')}
          sx={{
            flex: 1,
            minWidth: { xs: '100%', sm: 150 },
            p: 2,
            cursor: 'pointer',
            borderRadius: 2.5,
            border: '1px dashed rgba(255,61,0,0.3)',
            bgcolor: 'rgba(255,61,0,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1.5,
            transition: 'all 0.25s',
            '&:hover': {
              border: '1px dashed rgba(255,61,0,0.6)',
              bgcolor: 'rgba(255,61,0,0.08)',
              transform: 'translateY(-3px)',
              boxShadow: glow('#FF3D00'),
            },
          }}
        >
          <SyncIcon sx={{ color: '#FF3D00', fontSize: 20 }} />
          <Typography sx={{ color: '#FF3D00', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Demander une synchro
          </Typography>
        </Box>
      </Box>

      {/* ── Activity Chart ───────────────────────────────────────────────── */}
      {activityLoading ? (
        <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.03)', mb: 3 }} />
      ) : (
        <Box sx={{ mb: 3 }}>
          <WidgetMatchsParHeure matches={recentMatches} />
        </Box>
      )}

      {/* ── Quick Links ──────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: '#334155', mr: 0.5 }}>Accès rapide ·</Typography>
        {[
          { label: 'Toutes les ligues', path: '/ligues', color: '#F59E0B' },
          { label: 'Compétitions', path: '/competitions', color: '#3B82F6' },
          { label: 'Coachs', path: '/coachs', color: '#00E676' },
          { label: 'Synchroniser', path: '/synchro', color: '#FF3D00' },
        ].map(item => (
          <Chip
            key={item.path}
            label={item.label}
            size="small"
            onClick={() => navigate(item.path)}
            sx={{
              bgcolor: alpha(item.color, 0.08),
              color: item.color,
              border: `1px solid ${alpha(item.color, 0.2)}`,
              fontWeight: 600,
              fontSize: '0.72rem',
              height: 26,
              borderRadius: 99,
              '&:hover': { bgcolor: alpha(item.color, 0.16), transform: 'scale(1.04)' },
              transition: 'all 0.2s',
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default Home;
