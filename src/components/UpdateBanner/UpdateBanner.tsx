'use client';

import { useVersionCheck } from '@/hooks/useVersionCheck';
import styles from './UpdateBanner.module.css';

export function UpdateBanner() {
  const { updateAvailable, newVersion, applyUpdate } = useVersionCheck();

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.icon}>🎉</span>
        <div className={styles.text}>
          <strong>New version available!</strong>
          <span className={styles.version}>v{newVersion}</span>
        </div>
        <button
          className={styles.updateButton}
          onClick={applyUpdate}
        >
          Update Now
        </button>
      </div>
    </div>
  );
}
