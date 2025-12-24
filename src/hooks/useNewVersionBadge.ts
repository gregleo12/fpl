import { useState, useEffect } from 'react';

export function useNewVersionBadge() {
  const [showBadge, setShowBadge] = useState(false);

  useEffect(() => {
    async function checkVersion() {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        const currentVersion = data.version;

        const lastSeenVersion = localStorage.getItem('lastSeenVersion');

        // Show badge if user hasn't seen this version yet
        if (lastSeenVersion && lastSeenVersion !== currentVersion) {
          setShowBadge(true);
        }
      } catch (error) {
        console.error('Failed to check version for badge:', error);
      }
    }

    checkVersion();

    // Listen for storage changes (when user visits /updates in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lastSeenVersion') {
        checkVersion();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return showBadge;
}
