'use client';

import { useEffect, useState } from 'react';

const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes
const UPDATE_STORAGE_KEY = 'fpl-pending-update';

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Get current version from package.json
    const packageJson = require('../../package.json');
    const CURRENT_VERSION = packageJson.version;
    setCurrentVersion(CURRENT_VERSION);

    // Check if there's a pending update in localStorage
    const pendingUpdate = localStorage.getItem(UPDATE_STORAGE_KEY);
    if (pendingUpdate) {
      const { version: pendingVersion } = JSON.parse(pendingUpdate);

      // If we're still on the old version, show the update banner
      if (pendingVersion !== CURRENT_VERSION) {
        console.log(`Pending update restored: ${pendingVersion} (current: ${CURRENT_VERSION})`);
        setNewVersion(pendingVersion);
        setUpdateAvailable(true);
      } else {
        // We've successfully updated, clear the pending flag
        console.log('Update successfully applied, clearing pending flag');
        localStorage.removeItem(UPDATE_STORAGE_KEY);
      }
    }

    async function checkVersion() {
      try {
        // Fetch version from server with cache-busting
        const response = await fetch(`/api/version?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });

        if (!response.ok) {
          console.warn('Version check failed:', response.status);
          return;
        }

        const data = await response.json();

        // Compare versions
        if (data.version !== CURRENT_VERSION) {
          console.log(`New version available: ${data.version} (current: ${CURRENT_VERSION})`);
          setNewVersion(data.version);
          setUpdateAvailable(true);

          // Persist the pending update to localStorage
          localStorage.setItem(UPDATE_STORAGE_KEY, JSON.stringify({
            version: data.version,
            detectedAt: Date.now()
          }));
        } else {
          // Current version matches server version - clear any stale pending updates
          const pendingUpdate = localStorage.getItem(UPDATE_STORAGE_KEY);
          if (pendingUpdate) {
            console.log('Already on latest version, clearing stale notification');
            localStorage.removeItem(UPDATE_STORAGE_KEY);
            setUpdateAvailable(false);
          }
        }
      } catch (error) {
        console.error('Version check error:', error);
        // Fail silently - don't bother user with version check errors
      }
    }

    // Check immediately on mount
    checkVersion();

    // Check periodically
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const applyUpdate = async () => {
    try {
      // First, check if we're already on the latest version
      const response = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (response.ok) {
        const data = await response.json();

        // Re-read current version to ensure accuracy
        const packageJson = require('../../package.json');
        const CURRENT_VERSION = packageJson.version;

        if (data.version === CURRENT_VERSION) {
          // We're already on the latest version, just clear the notification
          console.log('Already on latest version, dismissing notification');
          localStorage.removeItem(UPDATE_STORAGE_KEY);
          setUpdateAvailable(false);
          return;
        }
      }

      // Not on latest version yet, proceed with cache clearing and reload
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('Cleared caches:', cacheNames);
      }

      // Clear service worker cache if exists
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => registration.unregister())
        );
      }

      // Hard reload the page
      window.location.reload();
    } catch (error) {
      console.error('Update failed:', error);
      // Fallback: simple reload
      window.location.reload();
    }
  };

  return {
    updateAvailable,
    newVersion,
    currentVersion,
    applyUpdate
  };
}
