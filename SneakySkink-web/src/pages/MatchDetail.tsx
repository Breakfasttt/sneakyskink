import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Paper,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  EmojiEvents as TrophyIcon,
  SportsEsports as MatchIcon,
  Star as StarIcon,
  CancelPresentation as ForfeitIcon,
  CompareArrows as VSIcon,
} from '@mui/icons-material';
import { api } from '../api';
import { getRaceInfo } from '../utils/raceHelper';

interface PlayerStatRow {
  playerId: string;
  name: string | null;
  number: number;
  type: string;
  matchPlayed: boolean;
  mvp: boolean;
  xpGained: number;
  touchdowns: number;
  passes: number;
  catches: number;
  interceptions: number;
  yardsRunning: number;
  yardsPassing: number;
  blocksSucceeded: number;
  blocksSustained: number;
  armourBreaks: number;
  tackles: number;
  pushouts: number;
  casualtiesInflicted: number;
  koInflicted: number;
  injuriesInflicted: number;
  deadInflicted: number;
  casualtiesSustained: number;
  koSustained: number;
  injuriesSustained: number;
  deadSustained: number;
  newCasualties: string[];
}

interface TeamBlock {
  id: string;
  name: string;
  logo: string | null;
  raceId: number;
  score: number;
  coach: { id: string; name: string; country: string | null } | null;
  stats: any;
  players: PlayerStatRow[];
}

interface MatchDetailSheet {
  id: string;
  startedAt: string;
  finishedAt: string;
  round: number;
  platform: string;
  status: string;
  leagueId: string;
  leagueName: string;
  competitionId: string;
  competitionName: string;
  competitionFormat: string;
  homeTeam: TeamBlock;
  awayTeam: TeamBlock;
}

export const MatchDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<MatchDetailSheet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tabValue, setTabValue] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const fetchMatchDetails = async () => {
      try {
        setLoading(true);
        const response = await api.getMatch(id);
        setMatch((response as any).data || response);
      } catch (err) {
        console.error('Failed to load match details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchDetails();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress color="primary" size={50} />
      </Box>
    );
  }

  if (!match) {
    return (
      <Box sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h5" color="error">
          Match introuvable
        </Typography>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Retour
        </Button>
      </Box>
    );
  }

  const homeRace = getRaceInfo(match.homeTeam.raceId);
  const awayRace = getRaceInfo(match.awayTeam.raceId);

  // Check if someone conceded
  const homeConceded = match.homeTeam.stats?.conceded === true;
  const awayConceded = match.awayTeam.stats?.conceded === true;

  // Helpers to draw comparative bars
  const renderCompareRow = (label: string, homeVal: number, awayVal: number, prefix = '') => {
    const total = homeVal + awayVal || 1;
    const homePct = Math.round((homeVal / total) * 100);
    const awayPct = 100 - homePct;

    return (
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#00E676' }}>
            {homeVal}{prefix}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
            {label}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#FF3D00' }}>
            {awayVal}{prefix}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.03)' }}>
          <Box sx={{ width: `${homePct}%`, bgcolor: '#00E676' }} />
          <Box sx={{ width: `${awayPct}%`, bgcolor: '#FF3D00' }} />
        </Box>
      </Box>
    );
  };

  // Aggregated team stats sums
  const getAggSum = (players: PlayerStatRow[], key: keyof PlayerStatRow) => {
    return players.reduce((sum, p) => {
      const val = p[key];
      return sum + (typeof val === 'number' ? val : 0);
    }, 0);
  };

  // Render Roster player stats table
  const renderPlayerStatsTable = (team: TeamBlock) => (
    <TableContainer component={Paper} sx={{ bgcolor: '#151D30', border: '1px solid rgba(148, 163, 184, 0.08)' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell align="center" style={{ width: 40 }}>#</TableCell>
            <TableCell>Nom</TableCell>
            <TableCell>Poste</TableCell>
            <TableCell align="center">TD</TableCell>
            <TableCell align="center">Passes</TableCell>
            <TableCell align="center">Bloc.</TableCell>
            <TableCell align="center">KOs</TableCell>
            <TableCell align="center">Inj.</TableCell>
            <TableCell align="center">MVP</TableCell>
            <TableCell align="center">XP</TableCell>
            <TableCell>Status / Blessure</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {team.players.map((p) => {
            const hasStatus = p.mvp || p.deadInflicted > 0 || p.newCasualties.length > 0 || p.xpGained > 0;
            return (
              <TableRow key={p.playerId} hover sx={{ opacity: p.matchPlayed ? 1 : 0.4 }}>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{p.number}</TableCell>
                <TableCell sx={{ fontWeight: 650 }}>{p.name || `Joueur #${p.number}`}</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontSize: '0.8rem' }}>{p.type.replace(/^[a-z]+_/i, '')}</TableCell>
                <TableCell align="center" sx={{ fontWeight: p.touchdowns > 0 ? 800 : 400, color: p.touchdowns > 0 ? '#00E676' : 'inherit' }}>{p.touchdowns || '-'}</TableCell>
                <TableCell align="center">{p.passes || '-'}</TableCell>
                <TableCell align="center">{p.blocksSucceeded || '-'}</TableCell>
                <TableCell align="center" sx={{ color: p.koInflicted > 0 ? '#F59E0B' : 'inherit' }}>{p.koInflicted || '-'}</TableCell>
                <TableCell align="center" sx={{ color: p.casualtiesInflicted > 0 ? '#FF3D00' : 'inherit' }}>{p.casualtiesInflicted || '-'}</TableCell>
                <TableCell align="center">{p.mvp ? <StarIcon style={{ color: '#F59E0B', fontSize: 16 }} /> : '-'}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#38BDF8' }}>{p.xpGained > 0 ? `+${p.xpGained}` : '-'}</TableCell>
                <TableCell>
                  {p.deadSustained > 0 ? (
                    <Chip label="MORT 💀" size="small" color="error" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                  ) : p.newCasualties.length > 0 ? (
                    <Chip label={`Blessé: ${p.newCasualties.join(', ')}`} size="small" color="warning" sx={{ fontWeight: 800, fontSize: '0.65rem' }} />
                  ) : !p.matchPlayed ? (
                    <Chip label="Banc" size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-in-out' }}>
      {/* Back to Competition */}
      <Button
        startIcon={<BackIcon />}
        onClick={() => navigate(`/competitions/${match.competitionId}`)}
        sx={{ mb: 3, fontWeight: 700, color: '#94A3B8' }}
      >
        Retour à la Compétition
      </Button>

      {/* Match Header Score Card */}
      <Paper
        className="glass-panel"
        sx={{
          p: { xs: 3, md: 5 },
          mb: 4,
          borderRadius: 4,
        }}
      >
        {/* League and competition info */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="caption" sx={{ color: '#00E676', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            🏆 {match.leagueName} &bull; {match.competitionName} (Round {match.round})
          </Typography>
        </Box>

        {/* Head-to-Head display */}
        <Grid container alignItems="center" spacing={4} sx={{ mb: 2 }}>
          {/* Home Team Column */}
          <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-end' }, textAlign: { xs: 'center', sm: 'right' } }}>
            <Avatar
              src={match.homeTeam.logo || undefined}
              alt={match.homeTeam.name}
              sx={{ width: 80, height: 80, mb: 2, bgcolor: '#0B0F19', border: `2px solid ${homeRace.color}` }}
            >
              🏈
            </Avatar>
            <Typography
              variant="h5"
              onClick={() => navigate(`/teams/${match.homeTeam.id}`)}
              sx={{ fontFamily: 'Outfit', fontWeight: 900, cursor: 'pointer', '&:hover': { color: '#00E676' } }}
            >
              {match.homeTeam.name}
            </Typography>
            <Chip label={homeRace.name} size="small" sx={{ mt: 1, bgcolor: homeRace.color, color: '#FFF', fontWeight: 700 }} />
            {match.homeTeam.coach && (
              <Typography
                variant="body2"
                onClick={() => navigate(`/coaches/${match.homeTeam.coach?.id}`)}
                sx={{ color: '#94A3B8', mt: 1.5, fontWeight: 600, cursor: 'pointer', '&:hover': { color: '#00E676' } }}
              >
                Coach : {match.homeTeam.coach.name} {match.homeTeam.coach.country && `(${match.homeTeam.coach.country})`}
              </Typography>
            )}
            {homeConceded && (
              <Chip
                icon={<ForfeitIcon />}
                label="CONCESSION / FORFAIT"
                color="error"
                sx={{ mt: 2, fontWeight: 800, animation: 'pulse 1.5s infinite' }}
              />
            )}
          </Grid>

          {/* Central score display */}
          <Grid item xs={12} sm={4} sx={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Box
              sx={{
                px: 4,
                py: 2,
                bgcolor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(148, 163, 184, 0.08)',
                borderRadius: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)',
              }}
            >
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#00E676', pr: 1 }}>
                {match.homeTeam.score}
              </Typography>
              <VSIcon style={{ color: '#64748B', fontSize: 28 }} />
              <Typography variant="h2" sx={{ fontFamily: 'Outfit', fontWeight: 900, color: '#FF3D00', pl: 1 }}>
                {match.awayTeam.score}
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 2, fontWeight: 700, textTransform: 'uppercase' }}>
              Platforme : {match.platform.toUpperCase()} &bull; Statut : {match.status}
            </Typography>
          </Grid>

          {/* Away Team Column */}
          <Grid item xs={12} sm={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, textAlign: { xs: 'center', sm: 'left' } }}>
            <Avatar
              src={match.awayTeam.logo || undefined}
              alt={match.awayTeam.name}
              sx={{ width: 80, height: 80, mb: 2, bgcolor: '#0B0F19', border: `2px solid ${awayRace.color}` }}
            >
              🏈
            </Avatar>
            <Typography
              variant="h5"
              onClick={() => navigate(`/teams/${match.awayTeam.id}`)}
              sx={{ fontFamily: 'Outfit', fontWeight: 900, cursor: 'pointer', '&:hover': { color: '#FF3D00' } }}
            >
              {match.awayTeam.name}
            </Typography>
            <Chip label={awayRace.name} size="small" sx={{ mt: 1, bgcolor: awayRace.color, color: '#FFF', fontWeight: 700 }} />
            {match.awayTeam.coach && (
              <Typography
                variant="body2"
                onClick={() => navigate(`/coaches/${match.awayTeam.coach?.id}`)}
                sx={{ color: '#94A3B8', mt: 1.5, fontWeight: 600, cursor: 'pointer', '&:hover': { color: '#FF3D00' } }}
              >
                Coach : {match.awayTeam.coach.name} {match.awayTeam.coach.country && `(${match.awayTeam.coach.country})`}
              </Typography>
            )}
            {awayConceded && (
              <Chip
                icon={<ForfeitIcon />}
                label="CONCESSION / FORFAIT"
                color="error"
                sx={{ mt: 2, fontWeight: 800, animation: 'pulse 1.5s infinite' }}
              />
            )}
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} textColor="primary" indicatorColor="primary">
          <Tab label="Statistiques Globales" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label="Roster Domicile" sx={{ fontWeight: 700, fontSize: '1rem' }} />
          <Tab label="Roster Extérieur" sx={{ fontWeight: 700, fontSize: '1rem' }} />
        </Tabs>
      </Box>

      {/* Tab 0: Comparative Stats */}
      {tabValue === 0 && (
        <Card>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 3 }}>
              📊 Comparatif des Statistiques d'Équipe
            </Typography>
            <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
              {renderCompareRow('Touchdowns', match.homeTeam.score, match.awayTeam.score)}
              {renderCompareRow('Passes réussies', getAggSum(match.homeTeam.players, 'passes'), getAggSum(match.awayTeam.players, 'passes'))}
              {renderCompareRow('Yards à la course', getAggSum(match.homeTeam.players, 'yardsRunning'), getAggSum(match.awayTeam.players, 'yardsRunning'))}
              {renderCompareRow('Yards à la passe', getAggSum(match.homeTeam.players, 'yardsPassing'), getAggSum(match.awayTeam.players, 'yardsPassing'))}
              {renderCompareRow('Blocages réussis', getAggSum(match.homeTeam.players, 'blocksSucceeded'), getAggSum(match.awayTeam.players, 'blocksSucceeded'))}
              {renderCompareRow('Armures brisées', getAggSum(match.homeTeam.players, 'armourBreaks'), getAggSum(match.awayTeam.players, 'armourBreaks'))}
              {renderCompareRow('KOs Infligés', getAggSum(match.homeTeam.players, 'koInflicted'), getAggSum(match.awayTeam.players, 'koInflicted'))}
              {renderCompareRow('Blessures Infligées', getAggSum(match.homeTeam.players, 'casualtiesInflicted'), getAggSum(match.awayTeam.players, 'casualtiesInflicted'))}
              {renderCompareRow('Morts Provoquées 💀', getAggSum(match.homeTeam.players, 'deadInflicted'), getAggSum(match.awayTeam.players, 'deadInflicted'))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tab 1: Home Roster player stats */}
      {tabValue === 1 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2, color: '#00E676' }}>
            🛡️ Feuille de Match - {match.homeTeam.name}
          </Typography>
          {renderPlayerStatsTable(match.homeTeam)}
        </Box>
      )}

      {/* Tab 2: Away Roster player stats */}
      {tabValue === 2 && (
        <Box sx={{ animation: 'fadeIn 0.2s ease-in-out' }}>
          <Typography variant="h6" sx={{ fontFamily: 'Outfit', fontWeight: 800, mb: 2, color: '#FF3D00' }}>
            ⚔️ Feuille de Match - {match.awayTeam.name}
          </Typography>
          {renderPlayerStatsTable(match.awayTeam)}
        </Box>
      )}
    </Box>
  );
};
