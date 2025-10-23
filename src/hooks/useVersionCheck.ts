'use client';

import { useEffect, useState } from 'react';

const CHECK_INTERVAL = 10 * 60 * 1000; // Check every 10 minutes

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Get current version from package.json
    const packageJson = require('../../package.json');
    const CURRENT_VERSION = packageJson.version;
    setCurrentVersion(CURRENT_VERSION);

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
