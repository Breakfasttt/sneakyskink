import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import Coaches from './pages/Coaches';
import CoachDetail from './pages/CoachDetail';
import Leagues from './pages/Leagues';
import LeagueDetail from './pages/LeagueDetail';
import Competitions from './pages/Competitions';
import CompetitionDetail from './pages/CompetitionDetail';
import TeamDetail from './pages/TeamDetail';
import MatchDetail from './pages/MatchDetail';
import Sync from './pages/Sync';
import ApiDocs from './pages/ApiDocs';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<SearchResults />} />
        <Route path="coachs" element={<Coaches />} />
        <Route path="coach/:id" element={<CoachDetail />} />
        <Route path="ligues" element={<Leagues />} />
        <Route path="ligue/:id" element={<LeagueDetail />} />
        <Route path="competitions" element={<Competitions />} />
        <Route path="competition/:id" element={<CompetitionDetail />} />
        <Route path="equipe/:id" element={<TeamDetail />} />
        <Route path="match/:id" element={<MatchDetail />} />
        <Route path="synchro" element={<Sync />} />
        <Route path="api-docs" element={<ApiDocs />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default App;
