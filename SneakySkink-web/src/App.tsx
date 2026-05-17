import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Leagues } from './pages/Leagues';
import { LeagueDetail } from './pages/LeagueDetail';
import { CompetitionsList } from './pages/CompetitionsList';
import { Competitions } from './pages/Competitions';
import { MatchDetail } from './pages/MatchDetail';
import { Search } from './pages/Search';
import { CoachDetail } from './pages/CoachDetail';
import { TeamDetail } from './pages/TeamDetail';
import { SyncManager } from './pages/SyncManager';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/leagues" element={<Leagues />} />
            <Route path="/leagues/:id" element={<LeagueDetail />} />
            <Route path="/competitions" element={<CompetitionsList />} />
            <Route path="/competitions/:id" element={<Competitions />} />
            <Route path="/matches/:id" element={<MatchDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="/coaches/:id" element={<CoachDetail />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/sync" element={<SyncManager />} />
            
            {/* Fallback to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
