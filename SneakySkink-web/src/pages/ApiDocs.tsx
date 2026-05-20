import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Check as CheckedIcon,
  IntegrationInstructions as DocIcon,
  OfflineBolt as ApiIcon,
} from '@mui/icons-material';

interface RouteDoc {
  name: string;
  sdkMethod: string;
  httpEndpoint: string;
  httpMethod: 'GET' | 'POST';
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  responseExample: any;
  sdkUsage: string;
}

const docsData: Record<string, RouteDoc[]> = {
  system: [
    {
      name: "Statut de l'API",
      sdkMethod: "getStatus()",
      httpEndpoint: "/api/",
      httpMethod: "GET",
      description: "Vérifie l'état de l'API de SneakySkink et retourne le volume d'enregistrements en base de données.",
      responseExample: {
        success: true,
        data: {
          name: "sneakyskink-api",
          version: "1.0.0",
          status: "OK",
          stats: {
            leagues: 14,
            competitions: 54,
            teams: 412,
            coaches: 182,
            matches: 2145
          }
        }
      },
      sdkUsage: `const status = await client.getStatus();\nconsole.log(status.stats.matches);`
    },
    {
      name: "État de la file d'attente",
      sdkMethod: "getSyncQueue()",
      httpEndpoint: "/api/sync/queue",
      httpMethod: "GET",
      description: "Récupère les volumes de synchronisation active, en attente, réussie ou en échec gérés par BullMQ.",
      responseExample: {
        active: 1,
        waiting: 3,
        completed: 124,
        failed: 2
      },
      sdkUsage: `const queue = await client.getSyncQueue();\nconsole.log(\`Tâches en attente : \${queue.waiting}\`);`
    }
  ],
  data: [
    {
      name: "Liste des Ligues",
      sdkMethod: "getLeagues()",
      httpEndpoint: "/api/leagues",
      httpMethod: "GET",
      description: "Retourne l'intégralité des ligues BB3 stockées en base de données.",
      responseExample: [
        {
          id: "3e5a31a9-7c89-49db-9588-410a688b14e6",
          name: "Ligue des Légendes BB3",
          logo: "https://cyanide.com/logos/league_logo_1.png",
          gamerCount: 24,
          active: true
        }
      ],
      sdkUsage: `const leagues = await client.getLeagues();`
    },
    {
      name: "Détails d'une Ligue",
      sdkMethod: "getLeague(id)",
      httpEndpoint: "/api/leagues/:id",
      httpMethod: "GET",
      description: "Retourne les informations d'une ligue avec la liste de ses compétitions actives.",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant unique de la ligue." }
      ],
      responseExample: {
        id: "3e5a31a9-7c89-49db-9588-410a688b14e6",
        name: "Ligue des Légendes BB3",
        competitions: [
          {
            id: "comp-uuid-99",
            name: "Saison 4 - Division 1",
            format: "RoundRobin",
            status: "InProgress"
          }
        ]
      },
      sdkUsage: `const leagueDetails = await client.getLeague('3e5a31a9-7c89-49db-9588-410a688b14e6');`
    },
    {
      name: "Détails d'une Équipe",
      sdkMethod: "getTeam(id)",
      httpEndpoint: "/api/teams/:id",
      httpMethod: "GET",
      description: "Retourne la fiche complète d'une équipe avec son coach et son effectif (players).",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant unique de l'équipe." }
      ],
      responseExample: {
        id: "team-uuid-1234",
        name: "Skink Attackers",
        raceId: 13,
        value: 1200,
        coach: { id: "coach-uuid-888", name: "Jean-Raptor" },
        players: [
          { id: "p-1", name: "Zippy", number: 1, type: "skink", xp: 12, level: 2 }
        ]
      },
      sdkUsage: `const team = await client.getTeam('team-uuid-1234');`
    }
  ],
  stats: [
    {
      name: "Statistiques Globales",
      sdkMethod: "getGlobalStats(isOfficial?)",
      httpEndpoint: "/api/stats/global",
      httpMethod: "GET",
      description: "Retourne le winrate global, la popularité des rosters, l'utilisation des races et les 200 derniers matchs.",
      parameters: [
        { name: "official", type: "boolean", required: false, description: "Filtrer uniquement sur les compétitions officielles Cyanide." }
      ],
      responseExample: {
        scope: "GLOBAL",
        summary: { totalMatches: 2145, forfeits: 140 },
        globalWinrate: { wins: 1980, draws: 165, losses: 0 },
        popularity: { racePopularity: [{ raceId: 13, teamCount: 42 }] },
        rosterUsage: [{ raceId: 13, teamCount: 42, wins: 12, draws: 3, losses: 5 }],
        matches: [
          { id: "match-1", homeScore: 2, awayScore: 1, startedAt: "2026-05-20T10:00:00Z" }
        ]
      },
      sdkUsage: `const globalStats = await client.getGlobalStats();`
    },
    {
      name: "Statistiques d'un Coach",
      sdkMethod: "getCoachStats(id)",
      httpEndpoint: "/api/stats/coach/:id",
      httpMethod: "GET",
      description: "Retourne le bilan complet d'un coach, ses statistiques physiques cumulées, ses équipes, ses joueurs et ses matchs.",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant du coach." }
      ],
      responseExample: {
        coach: { id: "coach-1", name: "SuperCoach" },
        summary: { totalMatches: 48, wins: 28, draws: 10, losses: 10 },
        performance: { touchdowns: 96, kos: 54, injuriesInflicted: 24, deadInflicted: 2 },
        rosterUsage: [{ raceId: 12, teamCount: 2, matchesCount: 30, wins: 18, draws: 6, losses: 6 }],
        matches: [],
        players: []
      },
      sdkUsage: `const coachStats = await client.getCoachStats('coach-1');`
    },
    {
      name: "Statistiques d'une Équipe",
      sdkMethod: "getTeamStats(id)",
      httpEndpoint: "/api/stats/team/:id",
      httpMethod: "GET",
      description: "Retourne les statistiques de performance d'une équipe, son winrate consolidé, ses matchs et ses joueurs.",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant de l'équipe." }
      ],
      responseExample: {
        team: { id: "team-1", name: "Green Skinks", raceId: 13 },
        summary: { totalMatches: 12, wins: 8, draws: 2, losses: 2, winrate: 66.67, forfeits: 0 },
        performance: { touchdowns: 24, kos: 12, injuriesInflicted: 8, deadInflicted: 0 },
        matches: [],
        players: []
      },
      sdkUsage: `const teamStats = await client.getTeamStats('team-1');`
    },
    {
      name: "Statistiques d'un Joueur",
      sdkMethod: "getPlayerStats(id)",
      httpEndpoint: "/api/stats/player/:id",
      httpMethod: "GET",
      description: "Retourne la fiche de statistiques individuelle cumulée d'un joueur et tous ses matchs joués.",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant du joueur." }
      ],
      responseExample: {
        player: { id: "p-1", name: "Slippery Skink", number: 4, level: 3 },
        summary: { totalMatches: 10, wins: 6, draws: 2, losses: 2, winrate: 60.00 },
        performance: { touchdowns: 14, passes: 1, catches: 12, casualtiesSustained: 1, deadSustained: 0 },
        matches: []
      },
      sdkUsage: `const playerStats = await client.getPlayerStats('p-1');`
    }
  ],
  sync: [
    {
      name: "Forcer la synchro d'un Coach",
      sdkMethod: "syncCoach(id)",
      httpEndpoint: "/api/sync/coach/:id",
      httpMethod: "POST",
      description: "Ajoute un job de synchronisation en tâche de fond pour mettre à jour les équipes et matchs d'un coach.",
      parameters: [
        { name: "id", type: "string (UUID)", required: true, description: "Identifiant unique du coach." }
      ],
      responseExample: {
        success: true,
        jobId: "sync:coach:coach-1:1716223400"
      },
      sdkUsage: `const res = await client.syncCoach('coach-1');\nconsole.log(\`Job BullMQ démarré : \${res.jobId}\`);`
    }
  ]
};

const ApiDocs: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('system');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <Box sx={{ py: 2 }}>
      {/* En-tête Page */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Paper
          elevation={0}
          sx={{
            p: 1.5,
            borderRadius: 3,
            bgcolor: 'rgba(0, 230, 118, 0.08)',
            border: '1px solid rgba(0, 230, 118, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ApiIcon sx={{ color: '#00E676', fontSize: 32 }} />
        </Paper>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#F8FAFC', fontFamily: 'Outfit' }}>
            🔌 SneakyAPI Hub
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Documentation officielle du SDK client-api et des points d'accès HTTP REST de l'écosystème SneakySkink.
          </Typography>
        </Box>
      </Box>

      {/* Guide Installation Rapide */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 3,
          border: '1px solid rgba(148, 163, 184, 0.08)',
          bgcolor: 'rgba(15, 23, 42, 0.4)',
          position: 'relative',
        }}
      >
        <Typography variant="subtitle1" sx={{ color: '#F8FAFC', fontWeight: 800, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DocIcon sx={{ color: '#00E676', fontSize: 20 }} /> Guide d'intégration du SDK TypeScript
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2, lineHeight: 1.6 }}>
          Le SDK client est disponible localement sous forme de package npm autonome. Pour l'ajouter à vos scripts ou à vos bots :
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 0.5, display: 'block' }}>1. INSTALLATION NPM</Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#090D16',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.05)',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <code>npm install ../sneakyskink-api-client</code>
              <Tooltip title={copiedText === 'install' ? 'Copié !' : 'Copier'}>
                <IconButton size="small" onClick={() => handleCopy('npm install ../sneakyskink-api-client', 'install')} sx={{ color: '#64748B' }}>
                  {copiedText === 'install' ? <CheckedIcon size={16} sx={{ color: '#00E676' }} /> : <CopyIcon size={16} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 0.5, display: 'block' }}>2. INITIALISATION DU SNEAKYSKINKAPICLIENT</Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: '#090D16',
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.05)',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#E2E8F0',
                whiteSpace: 'pre',
                overflowX: 'auto',
                position: 'relative',
              }}
            >
              <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                <Tooltip title={copiedText === 'init' ? 'Copié !' : 'Copier'}>
                  <IconButton
                    size="small"
                    onClick={() => handleCopy(`import { SneakySkinkApiClient } from 'sneakyskink-api-client';\n\nconst client = new SneakySkinkApiClient({\n  baseUrl: 'http://localhost:3001',\n});`, 'init')}
                    sx={{ color: '#64748B' }}
                  >
                    {copiedText === 'init' ? <CheckedIcon size={16} sx={{ color: '#00E676' }} /> : <CopyIcon size={16} />}
                  </IconButton>
                </Tooltip>
              </Box>
              {`import { SneakySkinkApiClient } from 'sneakyskink-api-client';\n\nconst client = new SneakySkinkApiClient({\n  baseUrl: 'http://localhost:3001',\n});`}
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Barre d'onglets catégories */}
      <Box sx={{ borderBottom: '1px solid rgba(148, 163, 184, 0.08)', mb: 3 }}>
        <Tabs
          value={activeCategory}
          onChange={(_, newValue) => setActiveCategory(newValue)}
          sx={{
            '& .MuiTabs-indicator': { bgcolor: '#00E676' },
            '& .MuiTab-root': { color: '#94A3B8', fontWeight: 700, '&.Mui-selected': { color: '#00E676' } },
          }}
        >
          <Tab value="system" label="Système" />
          <Tab value="data" label="Données de Jeu" />
          <Tab value="stats" label="Statistiques & Performance" />
          <Tab value="sync" label="Synchronisation" />
        </Tabs>
      </Box>

      {/* Corps Documentation */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {docsData[activeCategory]?.map((route, index) => {
          const docId = `${activeCategory}_${index}`;
          return (
            <Paper
              key={docId}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid rgba(148, 163, 184, 0.08)',
                bgcolor: 'rgba(11, 15, 25, 0.6)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {/* Entête Endpoint */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Chip
                    label={route.httpMethod}
                    sx={{
                      bgcolor: route.httpMethod === 'GET' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                      color: route.httpMethod === 'GET' ? '#00E676' : '#C084FC',
                      fontWeight: 900,
                      border: `1px solid ${route.httpMethod === 'GET' ? 'rgba(0, 230, 118, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                      borderRadius: 1.5,
                    }}
                  />
                  <Typography variant="h6" sx={{ color: '#F8FAFC', fontWeight: 800 }}>
                    {route.name}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>ENDPOINT :</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#94A3B8', bgcolor: '#090D16', px: 1, py: 0.5, borderRadius: 1.5 }}>
                    {route.httpEndpoint}
                  </Typography>
                </Box>
              </Box>

              <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3, lineHeight: 1.6 }}>
                {route.description}
              </Typography>

              {/* Paramètres si présents */}
              {route.parameters && route.parameters.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#F8FAFC', fontWeight: 800, mb: 1 }}>
                    Paramètres de requête
                  </Typography>
                  <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
                        <TableRow>
                          <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Nom</TableCell>
                          <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Type</TableCell>
                          <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Requis</TableCell>
                          <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Description</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {route.parameters.map((param) => (
                          <TableRow key={param.name}>
                            <TableCell sx={{ color: '#00E676', fontFamily: 'monospace', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{param.name}</TableCell>
                            <TableCell sx={{ color: '#94A3B8', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{param.type}</TableCell>
                            <TableCell sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <Chip
                                size="small"
                                label={param.required ? 'Oui' : 'Non'}
                                sx={{
                                  bgcolor: param.required ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                                  color: param.required ? '#EF4444' : '#94A3B8',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ color: '#64748B', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>{param.description}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Code Usage */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                {/* SDK Client Usage */}
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, mb: 0.5, display: 'block' }}>USAGE SDK CLIENT</Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#090D16',
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      color: '#E2E8F0',
                      whiteSpace: 'pre',
                      overflowX: 'auto',
                      position: 'relative',
                      minHeight: 120,
                    }}
                  >
                    <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                      <Tooltip title={copiedText === `${docId}_sdk` ? 'Copié !' : 'Copier'}>
                        <IconButton size="small" onClick={() => handleCopy(route.sdkUsage, `${docId}_sdk`)} sx={{ color: '#64748B' }}>
                          {copiedText === `${docId}_sdk` ? <CheckedIcon size={16} sx={{ color: '#00E676' }} /> : <CopyIcon size={16} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <span style={{ color: '#A855F7' }}>// Méthode : {route.sdkMethod}</span>
                    {`\n` + route.sdkUsage}
                  </Box>
                </Box>

                {/* Exemple de réponse */}
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, mb: 0.5, display: 'block' }}>EXEMPLE DE RÉPONSE API</Typography>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: '#090D16',
                      borderRadius: 2,
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      color: '#34D399',
                      whiteSpace: 'pre',
                      overflowX: 'auto',
                      position: 'relative',
                      maxHeight: 120,
                      overflowY: 'auto',
                    }}
                  >
                    <Box sx={{ position: 'absolute', right: 8, top: 8 }}>
                      <Tooltip title={copiedText === `${docId}_json` ? 'Copié !' : 'Copier'}>
                        <IconButton size="small" onClick={() => handleCopy(JSON.stringify(route.responseExample, null, 2), `${docId}_json`)} sx={{ color: '#64748B' }}>
                          {copiedText === `${docId}_json` ? <CheckedIcon size={16} sx={{ color: '#00E676' }} /> : <CopyIcon size={16} />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                    {JSON.stringify(route.responseExample, null, 2)}
                  </Box>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default ApiDocs;
