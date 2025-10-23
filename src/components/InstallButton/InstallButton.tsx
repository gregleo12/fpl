'use client';

import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import styles from './InstallButton.module.css';

interface IOSInstallInstructionsProps {
  onClose: () => void;
}

function IOSInstallInstructions({ onClose }: IOSInstallInstructionsProps) {
  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          ✕
        </button>

        <h2 className={styles.title}>Install FPL H2H</h2>
        <p className={styles.subtitle}>Add to your home screen for quick access</p>

        <div className={styles.instructions}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                Tap the <strong>Share</strong> button
              </p>
              <div className={styles.shareIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                </svg>
              </div>
              <p className={styles.hint}>
                (At the bottom of Safari)
              </p>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                Scroll down and tap <strong>Add to Home Screen</strong>
              </p>
              <div className={styles.addIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm5 11h-4v4H9v-4H5V9h4V5h2v4h4v2z"/>
                </svg>
              </div>
            </div>
          </div>

          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepContent}>
              <p className={styles.stepText}>
                Tap <strong>Add</strong> in the top-right corner
              </p>
            </div>
          </div>
        </div>

        <div className={styles.benefit}>
          <p>✨ Access the app instantly from your home screen</p>
          <p>🚀 Works offline with cached data</p>
          <p>📱 Full-screen experience without browser UI</p>
        </div>

        <button className={styles.gotItButton} onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
}

export function InstallButton() {
  const { isInstallable, isInstalled, platform, handleInstall } = useInstallPrompt();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if not installable
  if (!isInstallable) {
    return null;
  }

  const handleClick = () => {
    if (platform === 'ios') {
      // Show instructions modal for iOS
      setShowIOSInstructions(true);
    } else {
      // Trigger native install prompt for Android/Desktop
      handleInstall();
    }
  };

  return (
    <>
      <button onClick={handleClick} className={styles.installButton}>
        <svg className={styles.icon} width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm5 11h-4v4H9v-4H5V9h4V5h2v4h4v2z"/>
        </svg>
        <span>Install App</span>
      </button>

      {showIOSInstructions && (
        <IOSInstallInstructions onClose={() => setShowIOSInstructions(false)} />
      )}
    </>
  );
}
