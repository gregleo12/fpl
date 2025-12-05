'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { loadState, saveState, clearState } from '@/lib/storage';
import styles from './MyLeagues.module.css';

interface SavedLeague {
  id: string;
  name: string;
  myTeamId?: string;
  myTeamName?: string;
  myManagerName?: string;
}

const SAVED_LEAGUES_KEY = 'savedLeagues';
const MAX_LEAGUES = 5;

export default function MyLeagues() {
  const router = useRouter();
  const [savedLeagues, setSavedLeagues] = useState<SavedLeague[]>([]);
  const [currentLeagueId, setCurrentLeagueId] = useState<string>('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [newLeagueId, setNewLeagueId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    // Load current league
    const state = loadState();
    if (state) {
      setCurrentLeagueId(state.leagueId);

      // Load saved leagues from localStorage
      const saved = getSavedLeagues();

      // Ensure current league is in the saved leagues with team info
      const currentExists = saved.find(l => l.id === state.leagueId);
      if (!currentExists) {
        const updated = [...saved, {
          id: state.leagueId,
          name: state.leagueName,
          myTeamId: state.myTeamId,
          myTeamName: state.myTeamName,
          myManagerName: state.myManagerName
        }];
        setSavedLeagues(updated);
        saveSavedLeagues(updated);
      } else {
        // Update current league with latest team info if missing
        const updated = saved.map(l =>
          l.id === state.leagueId
            ? { ...l, myTeamId: state.myTeamId, myTeamName: state.myTeamName, myManagerName: state.myManagerName }
            : l
        );
        setSavedLeagues(updated);
        saveSavedLeagues(updated);
      }
    }
  }, []);

  function getSavedLeagues(): SavedLeague[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(SAVED_LEAGUES_KEY);
    return data ? JSON.parse(data) : [];
  }

  function saveSavedLeagues(leagues: SavedLeague[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_LEAGUES_KEY, JSON.stringify(leagues));
    }
  }

  async function handleSwitchLeague(leagueId: string) {
    if (leagueId === currentLeagueId) return;

    // Find the saved league
    const savedLeague = savedLeagues.find(l => l.id === leagueId);
    if (!savedLeague) return;

    try {
      // Fetch the league data to get fresh name
      const response = await fetch(`/api/league/${leagueId}`);
      if (!response.ok) throw new Error('Failed to fetch league data');

      const statsResponse = await fetch(`/api/league/${leagueId}/stats`);
      if (!statsResponse.ok) throw new Error('Failed to fetch league stats');

      const statsData = await statsResponse.json();

      const leagueName = statsData.league?.name || `League ${leagueId}`;

      // Check if we have saved team info for this league
      if (savedLeague.myTeamId && savedLeague.myTeamName && savedLeague.myManagerName) {
        // We have team info - switch directly
        saveState({
          leagueId,
          leagueName,
          myTeamId: savedLeague.myTeamId,
          myTeamName: savedLeague.myTeamName,
          myManagerName: savedLeague.myManagerName,
          lastFetched: new Date().toISOString()
        });

        // Reload dashboard
        router.push('/dashboard');
        window.location.reload();
      } else {
        // No team info - need to select team first
        // Update saved leagues with the name
        const updated = savedLeagues.map(l =>
          l.id === leagueId ? { ...l, name: leagueName } : l
        );
        setSavedLeagues(updated);
        saveSavedLeagues(updated);

        // Store league data in sessionStorage for team selection
        sessionStorage.setItem('temp_league', JSON.stringify({
          leagueId,
          leagueName,
          standings: statsData.standings
        }));

        // Clear current state and go to team selection
        clearState();
        router.push('/setup/team');
      }
    } catch (error) {
      alert('Failed to switch league. Please try again.');
    }
  }

  function handleRemoveLeague(leagueId: string, leagueName: string) {
    // Cannot remove current league
    if (leagueId === currentLeagueId) {
      alert('Cannot remove the current league. Switch to another league first.');
      return;
    }

    if (confirm(`Remove "${leagueName}" from your saved leagues?`)) {
      const updated = savedLeagues.filter(l => l.id !== leagueId);
      setSavedLeagues(updated);
      saveSavedLeagues(updated);
    }
  }

  async function handleAddLeague() {
    const leagueId = newLeagueId.trim();

    if (!leagueId) {
      setAddError('Please enter a league ID');
      return;
    }

    // Check if already saved
    if (savedLeagues.some(l => l.id === leagueId)) {
      setAddError('League already saved');
      return;
    }

    setIsAdding(true);
    setAddError('');

    try {
      // Fetch league data to get name
      const response = await fetch(`/api/league/${leagueId}`);
      if (!response.ok) throw new Error('Failed to fetch league');

      const statsResponse = await fetch(`/api/league/${leagueId}/stats`);
      if (!statsResponse.ok) throw new Error('Failed to fetch league stats');

      const statsData = await statsResponse.json();

      // Add to saved leagues
      const newLeague = {
        id: leagueId,
        name: statsData.league?.name || `League ${leagueId}`
      };

      const updated = [...savedLeagues, newLeague];
      setSavedLeagues(updated);
      saveSavedLeagues(updated);

      // Reset form
      setNewLeagueId('');
      setShowAddInput(false);
    } catch (error) {
      setAddError('Failed to add league. Check the ID and try again.');
    } finally {
      setIsAdding(false);
    }
  }

  const canAddMore = savedLeagues.length < MAX_LEAGUES;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>My Leagues (max {MAX_LEAGUES})</h3>

      {savedLeagues.length === 0 ? (
        <p className={styles.empty}>No saved leagues</p>
      ) : (
        <ul className={styles.list}>
          {savedLeagues.map(league => {
            const isCurrent = league.id === currentLeagueId;
            return (
              <li
                key={league.id}
                className={`${styles.item} ${isCurrent ? styles.current : ''}`}
              >
                <button
                  className={styles.leagueButton}
                  onClick={() => handleSwitchLeague(league.id)}
                  disabled={isCurrent}
                >
                  {isCurrent && <span className={styles.checkmark}>✓</span>}
                  <span className={styles.leagueName}>{league.name}</span>
                  <span className={styles.leagueId}>({league.id})</span>
                </button>
                {!isCurrent && (
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveLeague(league.id, league.name)}
                    aria-label="Remove league"
                  >
                    ✕
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!canAddMore && (
        <p className={styles.maxReached}>Maximum of {MAX_LEAGUES} leagues saved</p>
      )}

      {canAddMore && !showAddInput && (
        <button
          className={styles.addButton}
          onClick={() => setShowAddInput(true)}
        >
          + Add League
        </button>
      )}

      {canAddMore && showAddInput && (
        <div className={styles.addForm}>
          <input
            type="text"
            value={newLeagueId}
            onChange={e => setNewLeagueId(e.target.value)}
            placeholder="Enter league ID"
            className={styles.input}
            disabled={isAdding}
          />
          <div className={styles.addButtons}>
            <button
              onClick={handleAddLeague}
              disabled={isAdding}
              className={styles.confirmButton}
            >
              {isAdding ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAddInput(false);
                setNewLeagueId('');
                setAddError('');
              }}
              disabled={isAdding}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          </div>
          {addError && <p className={styles.error}>{addError}</p>}
        </div>
      )}
    </div>
  );
}
