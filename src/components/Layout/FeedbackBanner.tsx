'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './FeedbackBanner.module.css';

const EXPIRY_DATE = new Date('2025-01-07');
const STORAGE_KEY = 'feedback-banner-dismissed-v1';

export function FeedbackBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if should show
    if (new Date() > EXPIRY_DATE) return;
    if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleReport = () => {
    window.open('https://chat.whatsapp.com/IDWsZR85kk49AaS1320Jrj', '_blank', 'noopener,noreferrer');
  };

  if (!isVisible) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.content}>
        <span className={styles.icon}>🔧</span>
        <span className={styles.text}>
          We just shipped a big update! Notice anything off?
        </span>
        <button onClick={handleReport} className={styles.reportButton}>
          Tell us on WhatsApp
        </button>
      </div>
      <button onClick={handleDismiss} className={styles.closeButton} aria-label="Dismiss banner">
        <X size={18} />
      </button>
    </div>
  );
}
