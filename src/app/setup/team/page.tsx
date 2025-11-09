'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveState, loadState } from '@/lib/storage';
import styles from './team.module.css';

export default function TeamSelectionPage() {
  const router = useRouter();
  const [tempData, setTempData] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);
  const [sortedStandings, setSortedStandings] = useState<any[]>([]);
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null);

  useEffect(() => {
    // Get temporary league data from sessionStorage
    const data = sessionStorage.getItem('temp_league');

    if (!data) {
      // No league selected, redirect back to start
      router.push('/');
      return;
    }

    const parsedData = JSON.parse(data);
    setTempData(parsedData);

    // Check for saved team selection
    const savedState = loadState();

    // Sort standings to put saved team at top (if exists and matches this league)
    const standings = [...parsedData.standings];
    if (savedState && savedState.leagueId === parsedData.leagueId) {
      const savedTeamIndex = standings.findIndex(
        (team: any) => team.entry_id.toString() === savedState.myTeamId
      );

      if (savedTeamIndex > -1) {
        // Move saved team to the top
        const [savedTeam] = standings.splice(savedTeamIndex, 1);
        standings.unshift(savedTeam);

        // Auto-select the saved team and track it for badge display
        setSelectedTeam(savedState.myTeamId);
        setSavedTeamId(savedState.myTeamId);
      }
    }

    setSortedStandings(standings);
  }, [router]);

  function handleContinue() {
    if (!selectedTeam || !tempData) return;

    const team = sortedStandings.find(
      (s: any) => s.entry_id.toString() === selectedTeam
    );

    if (!team) return;

    const state = {
      leagueId: tempData.leagueId,
      leagueName: tempData.leagueName,
      myTeamId: team.entry_id.toString(),
      myTeamName: team.team_name,
      myManagerName: team.player_name,
      lastFetched: new Date().toISOString()
    };

    // Always save state
    // If rememberMe is true, save to localStorage (persists across sessions)
    // If rememberMe is false, save to sessionStorage (current session only)
    if (rememberMe) {
      saveState(state);
    } else {
      // Save to sessionStorage for current session only
      sessionStorage.setItem('app_state', JSON.stringify(state));
    }

    // Clear temporary data
    sessionStorage.removeItem('temp_league');

    // Navigate to dashboard
    router.push('/dashboard');
  }

  function handleBack() {
    sessionStorage.removeItem('temp_league');
    router.push('/');
  }

  if (!tempData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>

        <h1 className={styles.title}>Who are you in this league?</h1>
        <p className={styles.leagueName}>{tempData.leagueName}</p>

        <div className={styles.teamList}>
          {sortedStandings.map((team: any) => (
            <label key={team.entry_id} className={styles.teamOption}>
              <input
                type="radio"
                name="team"
                value={team.entry_id}
                checked={selectedTeam === team.entry_id.toString()}
                onChange={(e) => setSelectedTeam(e.target.value)}
              />
              <div className={styles.teamInfo}>
                <span className={styles.manager}>{team.player_name}</span>
                <span className={styles.teamName}>{team.team_name}</span>
                <span className={styles.record}>
                  {team.matches_won}W-{team.matches_drawn}D-{team.matches_lost}L
                </span>
              </div>
              {team.entry_id.toString() === savedTeamId && (
                <span className={styles.savedTeamBadge}>YOUR TEAM</span>
              )}
            </label>
          ))}
        </div>

        <div className={styles.rememberMe}>
          <label>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Remember my selection (saves to this device)</span>
          </label>
        </div>

        <button
          onClick={handleContinue}
          disabled={!selectedTeam}
          className={styles.continueButton}
        >
          Continue to Dashboard
        </button>
      </div>
    </main>
  );
}
