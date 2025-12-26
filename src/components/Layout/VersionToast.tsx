'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import styles from './VersionToast.module.css';

export function VersionToast() {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [latestChangelogVersion, setLatestChangelogVersion] = useState<string | null>(null);

  useEffect(() => {
    async function checkForNewChangelog() {
      try {
        // Fetch changelog to get the latest entry
        const changelogResponse = await fetch('/changelog.json');
        const changelog = await changelogResponse.json();
        const latestVersion = changelog[0]?.version;

        if (!latestVersion) {
          return;
        }

        setLatestChangelogVersion(latestVersion);

        // Check if this is a new changelog entry
        const lastSeenChangelog = localStorage.getItem('lastSeenChangelog');

        if (lastSeenChangelog && lastSeenChangelog !== latestVersion) {
          setShowToast(true);

          // Auto-hide after 10 seconds
          setTimeout(() => {
            setShowToast(false);
          }, 10000);
        } else if (!lastSeenChangelog) {
          // First time user - set version without showing toast
          localStorage.setItem('lastSeenChangelog', latestVersion);
          localStorage.setItem('lastSeenVersion', latestVersion);
        }
      } catch (error) {
        console.error('Failed to check changelog:', error);
      }
    }

    checkForNewChangelog();
  }, []);

  const handleDismiss = () => {
    if (latestChangelogVersion) {
      localStorage.setItem('lastSeenChangelog', latestChangelogVersion);
      localStorage.setItem('lastSeenVersion', latestChangelogVersion);
    }
    setShowToast(false);
  };

  const handleViewUpdates = () => {
    if (latestChangelogVersion) {
      localStorage.setItem('lastSeenChangelog', latestChangelogVersion);
      localStorage.setItem('lastSeenVersion', latestChangelogVersion);
    }
    setShowToast(false);
    router.push('/updates');
  };

  if (!showToast || !latestChangelogVersion) {
    return null;
  }

  return (
    <div className={styles.toast}>
      <div className={styles.content}>
        <span className={styles.icon}>✨</span>
        <span className={styles.text}>
          Updated to v{latestChangelogVersion} —{' '}
          <button onClick={handleViewUpdates} className={styles.link}>
            See what's new
          </button>
        </span>
      </div>
      <button onClick={handleDismiss} className={styles.closeButton} aria-label="Dismiss">
        <X size={18} />
      </button>
    </div>
  );
}
