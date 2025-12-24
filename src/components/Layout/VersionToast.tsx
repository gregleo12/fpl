'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import styles from './VersionToast.module.css';

export function VersionToast() {
  const router = useRouter();
  const [showToast, setShowToast] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  useEffect(() => {
    async function checkVersion() {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        const version = data.version;

        setCurrentVersion(version);

        // Check if this is a new version
        const lastSeenVersion = localStorage.getItem('lastSeenVersion');

        if (lastSeenVersion && lastSeenVersion !== version) {
          setShowToast(true);

          // Auto-hide after 10 seconds
          setTimeout(() => {
            setShowToast(false);
          }, 10000);
        } else if (!lastSeenVersion) {
          // First time user - set version without showing toast
          localStorage.setItem('lastSeenVersion', version);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    }

    checkVersion();
  }, []);

  const handleDismiss = () => {
    if (currentVersion) {
      localStorage.setItem('lastSeenVersion', currentVersion);
    }
    setShowToast(false);
  };

  const handleViewUpdates = () => {
    if (currentVersion) {
      localStorage.setItem('lastSeenVersion', currentVersion);
    }
    setShowToast(false);
    router.push('/updates');
  };

  if (!showToast || !currentVersion) {
    return null;
  }

  return (
    <div className={styles.toast}>
      <div className={styles.content}>
        <span className={styles.icon}>✨</span>
        <span className={styles.text}>
          Updated to v{currentVersion} —{' '}
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
