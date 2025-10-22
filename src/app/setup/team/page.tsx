'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveState } from '@/lib/storage';
import styles from './team.module.css';

export default function TeamSelectionPage() {
  const router = useRouter();
  const [tempData, setTempData] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    // Get temporary league data from sessionStorage
    const data = sessionStorage.getItem('temp_league');

    if (!data) {
      // No league selected, redirect back to start
      router.push('/');
      return;
    }

    setTempData(JSON.parse(data));
  }, [router]);

  function handleContinue() {
    if (!selectedTeam || !tempData) return;

    const team = tempData.standings.find(
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

    if (rememberMe) {
      saveState(state);
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
          {tempData.standings.map((team: any) => (
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
