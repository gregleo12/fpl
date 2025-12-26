'use client';

import { RefreshCw, AlertCircle } from 'lucide-react';
import styles from './SyncBanner.module.css';

export interface SyncBannerProps {
  status: 'syncing' | 'failed';
  currentGW: number;
  lastSyncedGW?: number;
  errorMessage?: string;
  onRetry?: () => void;
}

export function SyncBanner({
  status,
  currentGW,
  lastSyncedGW,
  errorMessage,
  onRetry
}: SyncBannerProps) {
  if (status === 'syncing') {
    return (
      <div className={styles.banner} data-status="syncing">
        <div className={styles.spinner}>
          <RefreshCw size={16} className={styles.spinIcon} />
        </div>
        <div className={styles.content}>
          <span className={styles.title}>Syncing GW{currentGW} data...</span>
          {lastSyncedGW && lastSyncedGW > 0 && (
            <span className={styles.subtitle}>
              Showing GW{lastSyncedGW} data while syncing
            </span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={styles.banner} data-status="failed">
        <AlertCircle size={16} className={styles.errorIcon} />
        <div className={styles.content}>
          <span className={styles.title}>
            ⚠️ Could not sync GW{currentGW} data
          </span>
          {errorMessage && (
            <span className={styles.subtitle}>{errorMessage}</span>
          )}
        </div>
        {onRetry && (
          <button onClick={onRetry} className={styles.retryButton}>
            Try Again
          </button>
        )}
      </div>
    );
  }

  return null;
}
