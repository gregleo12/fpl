import { useState, useEffect } from 'react';

export function useNewVersionBadge() {
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    async function checkForNewChangelog() {
      try {
        // Fetch the changelog to get the latest entry
        const changelogResponse = await fetch('/changelog.json');
        const changelog = await changelogResponse.json();

        // Get the latest changelog version (first entry)
        const latestChangelogVersion = changelog[0]?.version;

        if (!latestChangelogVersion) {
          return;
        }

        // Check what changelog version the user last saw
        const lastSeenChangelog = localStorage.getItem('lastSeenChangelog');

        // Show badge if user hasn't seen this changelog version yet
        // Only show if there's a previous version (don't show on first visit)
        if (lastSeenChangelog && lastSeenChangelog !== latestChangelogVersion) {
          setShowBadge(true);
        }
      } catch (error) {
        console.error('Failed to check changelog for badge:', error);
      }
    }

    checkForNewChangelog();

    // Listen for storage changes (when user visits /updates in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastSeenChangelog') {
        checkForNewChangelog();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return showBadge;
}
