/**
 * Fichier : src/components/widgets/WidgetCalendrierMatchs/index.tsx
 * Description : Widget réutilisable affichant un calendrier des matchs joués avec navigation mensuelle et détails interactifs.
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  alpha,
  Divider,
} from '@mui/material';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  SportsSoccer as MatchIcon,
} from '@mui/icons-material';

interface TeamInfo {
  name: string;
}

interface MinimalMatch {
  id: string;
  startedAt: string | Date;
  homeScore: number;
  awayScore: number;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  competition?: { name: string } | null;
}

export interface WidgetCalendrierMatchsProps {
  matches: MinimalMatch[];
}

export const WidgetCalendrierMatchs: React.FC<WidgetCalendrierMatchsProps> = ({ matches }) => {
  // Trouver la date de début la plus récente pour initialiser le calendrier sur le mois d'activité récent
  const initialDate = useMemo(() => {
    if (matches.length === 0) return new Date();
    const sorted = [...matches].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    return new Date(sorted[0].startedAt);
  }, [matches]);

  const [currentDate, setCurrentDate] = useState<Date>(initialDate);
  const [selectedDayMatches, setSelectedDayMatches] = useState<MinimalMatch[]>([]);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  // Noms des mois et jours
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  const dayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  // 1. Regrouper les matchs par date localisée "YYYY-MM-DD"
  const matchesByDate = useMemo(() => {
    const map: Record<string, MinimalMatch[]> = {};
    matches.forEach(m => {
      const d = new Date(m.startedAt);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(m);
    });
    return map;
  }, [matches]);

  // 2. Calculer la structure du calendrier pour le mois courant
  const calendarCells = useMemo(() => {
    // Premier jour du mois
    const firstDay = new Date(year, month, 1);
    // Dernier jour du mois
    const lastDay = new Date(year, month + 1, 0);

    // Déterminer le jour de la semaine du 1er jour (0 pour Dimanche, 1 pour Lundi...)
    // On convertit pour avoir : Lundi=0, Mardi=1... Dimanche=6
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6; // Dimanche

    const cells = [];

    // Cellules vides au début (jours du mois précédent)
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null, matches: [] });
    }

    // Cellules du mois en cours
    const daysInMonth = lastDay.getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        day,
        dateStr,
        matches: matchesByDate[dateStr] || [],
      });
    }

    return cells;
  }, [year, month, matchesByDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDayMatches([]);
    setSelectedDayLabel('');
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDayMatches([]);
    setSelectedDayLabel('');
  };

  const handleDayClick = (cell: { day: number | null; dateStr: string | null; matches: MinimalMatch[] }) => {
    if (!cell.day || !cell.dateStr) return;
    setSelectedDayMatches(cell.matches);
    const dateObj = new Date(year, month, cell.day);
    setSelectedDayLabel(dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid rgba(148, 163, 184, 0.08)',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.2) 0%, rgba(15, 23, 42, 0.2) 100%)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2.5,
      }}
    >
      {/* Header avec Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Calendrier des Matchs
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton size="small" onClick={handlePrevMonth} sx={{ color: '#94A3B8' }}>
            <PrevIcon fontSize="small" />
          </IconButton>
          <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 800, minWidth: 120, textAlign: 'center' }}>
            {monthNames[month]} {year}
          </Typography>
          <IconButton size="small" onClick={handleNextMonth} sx={{ color: '#94A3B8' }}>
            <NextIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Grid Calendrier */}
      <Box>
        {/* Jours de la semaine */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1, textAlign: 'center' }}>
          {dayLabels.map(label => (
            <Box key={label}>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.65rem' }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Cases des jours */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {calendarCells.map((cell, idx) => {
            const hasMatches = cell.matches.length > 0;
            const isToday =
              cell.day &&
              new Date().getDate() === cell.day &&
              new Date().getMonth() === month &&
              new Date().getFullYear() === year;

            return (
              <Box
                key={idx}
                onClick={() => cell.day && handleDayClick(cell)}
                sx={{
                  height: 48,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: isToday
                    ? 'rgba(0, 230, 118, 0.4)'
                    : hasMatches
                    ? 'rgba(0, 230, 118, 0.15)'
                    : 'rgba(255, 255, 255, 0.02)',
                  background: hasMatches
                    ? 'rgba(0, 230, 118, 0.03)'
                    : 'rgba(21, 29, 48, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: cell.day ? 'pointer' : 'default',
                  opacity: cell.day ? 1 : 0.15,
                  position: 'relative',
                  transition: 'all 0.2s',
                  '&:hover': cell.day
                    ? {
                        borderColor: '#00E676',
                        background: 'rgba(0, 230, 118, 0.08)',
                        transform: 'translateY(-2px)',
                        boxShadow: hasMatches ? '0 0 10px rgba(0, 230, 118, 0.2)' : 'none',
                      }
                    : {},
                }}
              >
                {cell.day && (
                  <>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: isToday ? 900 : hasMatches ? 700 : 500,
                        color: isToday ? '#00E676' : hasMatches ? '#F8FAFC' : '#475569',
                        fontSize: '0.85rem',
                      }}
                    >
                      {cell.day}
                    </Typography>

                    {/* Indicateurs de matchs */}
                    {hasMatches && (
                      <Box sx={{ display: 'flex', gap: '3px', mt: '3px', position: 'absolute', bottom: 5 }}>
                        {cell.matches.slice(0, 3).map((_, dotIdx) => (
                          <Box
                            key={dotIdx}
                            sx={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              bgcolor: '#00E676',
                            }}
                          />
                        ))}
                        {cell.matches.length > 3 && (
                          <Box
                            sx={{
                              width: 4,
                              height: 4,
                              borderRadius: '50%',
                              bgcolor: '#FF3D00',
                            }}
                          />
                        )}
                      </Box>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Détails du Jour Sélectionné */}
      {selectedDayLabel && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)' }} />
          <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
            Matchs du {selectedDayLabel} ({selectedDayMatches.length})
          </Typography>

          {selectedDayMatches.length === 0 ? (
            <Typography variant="caption" sx={{ color: '#475569' }}>
              Aucun match joué ce jour.
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {selectedDayMatches.map(m => (
                <Paper
                  key={m.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid rgba(148, 163, 184, 0.05)',
                    bgcolor: 'rgba(30, 41, 59, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#F8FAFC' }}>
                      {m.homeTeam.name} <span style={{ color: '#00E676' }}>{m.homeScore}</span> - <span style={{ color: '#FF3D00' }}>{m.awayScore}</span> {m.awayTeam.name}
                    </Typography>
                    <MatchIcon sx={{ fontSize: 16, color: '#00E676' }} />
                  </Box>
                  {m.competition && (
                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                      Compétition : {m.competition.name}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
