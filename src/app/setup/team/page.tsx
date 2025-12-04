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
  const [savedTeamData, setSavedTeamData] = useState<any>(null);

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
    console.log('=== DEBUG: Saved State ===');
    console.log('Saved state:', savedState);
    console.log('Current league ID:', parsedData.leagueId);

    // Sort standings alphabetically by manager name
    const standings = [...parsedData.standings].sort((a: any, b: any) =>
      a.player_name.localeCompare(b.player_name)
    );

    if (savedState && savedState.leagueId === parsedData.leagueId) {
      console.log('League IDs match!');
      const savedTeamIndex = standings.findIndex(
        (team: any) => team.entry_id.toString() === savedState.myTeamId
      );
      console.log('Saved team index:', savedTeamIndex);
      console.log('Looking for team ID:', savedState.myTeamId);

      if (savedTeamIndex > -1) {
        const savedTeam = standings[savedTeamIndex];

        // Auto-select the saved team and track it for badge display and recent section
        setSelectedTeam(savedState.myTeamId);
        setSavedTeamId(savedState.myTeamId);
        setSavedTeamData(savedTeam);
        console.log('Saved team data set:', savedTeam);

        // Auto-continue to dashboard if this team was remembered (saved to localStorage)
        // Check if it's in localStorage (not just sessionStorage)
        if (typeof window !== 'undefined' && localStorage.getItem('fpl_h2h_state')) {
          console.log('Auto-continuing with saved team...');
          // Small delay to let user see the selection
          setTimeout(() => {
            router.push('/dashboard');
          }, 500);
        }
      } else {
        console.log('Team not found in standings');
      }
    } else {
      console.log('No saved state or league mismatch');
      console.log('Has saved state:', !!savedState);
      console.log('League match:', savedState?.leagueId === parsedData.leagueId);
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

    // Track team selection for managers analytics
    fetch('/api/admin/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: tempData.leagueId,
        endpoint: '/setup/team/select',
        method: 'POST',
        ip: 'unknown',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        selectedTeamId: team.entry_id
      })
    }).catch((err) => console.error('Tracking error:', err));

    // Clear temporary data
    sessionStorage.removeItem('temp_league');

    // Navigate to dashboard
    router.push('/dashboard');
  }

  function handleBack() {
    sessionStorage.removeItem('temp_league');
    router.push('/');
  }

  function handleRecentTeamClick() {
    if (!savedTeamData) return;

    // Select the team
    setSelectedTeam(savedTeamData.entry_id.toString());

    // Scroll to the team in the list
    const teamElement = document.querySelector(`input[value="${savedTeamData.entry_id}"]`);
    if (teamElement) {
      teamElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // Helper to capitalize words
  function capitalizeWords(str: string): string {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // Helper to add smart line breaks for long team names
  function breakAtCapital(teamName: string) {
    // If team name is short, return as is
    if (teamName.length <= 18) {
      return teamName;
    }

    // Find ALL capital letters in the string (excluding first character)
    const capitals: number[] = [];
    for (let i = 1; i < teamName.length; i++) {
      if (teamName[i] === teamName[i].toUpperCase() && teamName[i] !== teamName[i].toLowerCase()) {
        capitals.push(i);
      }
    }

    // If we found capitals, break at one that's roughly in the middle
    if (capitals.length > 0) {
      // Prefer breaking around the middle (40-60% of length)
      const midPoint = teamName.length / 2;
      let bestBreak = capitals[0];
      let bestDistance = Math.abs(capitals[0] - midPoint);

      for (const cap of capitals) {
        const distance = Math.abs(cap - midPoint);
        if (distance < bestDistance) {
          bestBreak = cap;
          bestDistance = distance;
        }
      }

      const line1 = teamName.slice(0, bestBreak);
      const line2 = teamName.slice(bestBreak);

      return (
        <>
          {line1}<br />{line2}
        </>
      );
    }

    // No capital found, try to break at space if it exists
    const spaceIndex = teamName.lastIndexOf(' ', teamName.length / 2);
    if (spaceIndex > 0) {
      const line1 = teamName.slice(0, spaceIndex);
      const line2 = teamName.slice(spaceIndex + 1);
      return (
        <>
          {line1}<br />{line2}
        </>
      );
    }

    // No good break point, return as is
    return teamName;
  }


  if (!tempData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  console.log('=== DEBUG: Render ===');
  console.log('Saved team data at render:', savedTeamData);
  console.log('Should show recent section:', !!savedTeamData);

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <button onClick={handleBack} className={styles.backButton}>
          ← Back
        </button>

        <h1 className={styles.title}>Who are you in this league?</h1>
        <p className={styles.leagueName}>{tempData.leagueName}</p>

        <div className={styles.teamsGrid}>
          {sortedStandings.map((team: any) => (
            <button
              key={team.entry_id}
              className={`${styles.teamTile} ${selectedTeam === team.entry_id.toString() ? styles.selected : ''}`}
              onClick={() => setSelectedTeam(team.entry_id.toString())}
            >
              <div className={styles.teamInfo}>
                <div className={styles.manager}>{capitalizeWords(team.player_name)}</div>
                <div className={styles.teamName}>{breakAtCapital(team.team_name)}</div>
              </div>
            </button>
          ))}
        </div>

        {savedTeamData && (
          <div className={styles.recentTeamSection}>
            <h3 className={styles.recentTeamHeader}>RECENT TEAM</h3>
            <div
              className={styles.recentTeamCard}
              onClick={handleRecentTeamClick}
            >
              <div className={styles.teamInfo}>
                <div className={styles.manager}>{capitalizeWords(savedTeamData.player_name)}</div>
                <div className={styles.teamName}>{breakAtCapital(savedTeamData.team_name)}</div>
              </div>
              <span className={styles.clickHint}>→</span>
            </div>
          </div>
        )}

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
