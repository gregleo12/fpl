'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import changelog from '@/data/changelog.json';
import styles from './updates.module.css';

export default function UpdatesPage() {
  const router = useRouter();

  // Mark version as seen when user visits this page
  useEffect(() => {
    async function markVersionAsSeen() {
      try {
        const response = await fetch('/api/version');
        const data = await response.json();
        localStorage.setItem('lastSeenVersion', data.version);
      } catch (error) {
        console.error('Failed to mark version as seen:', error);
      }
    }

    markVersionAsSeen();
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <button onClick={() => router.back()} className={styles.backButton}>
          ← Back
        </button>

        <h1 className={styles.title}>What's New</h1>

        <div className={styles.changelogList}>
          {changelog.map((update) => (
            <div key={update.version} className={styles.updateCard}>
              <div className={styles.updateHeader}>
                <span className={styles.version}>v{update.version}</span>
                <span className={styles.date}>
                  {new Date(update.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h2 className={styles.updateTitle}>{update.title}</h2>
              <ul className={styles.changesList}>
                {update.changes.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            More updates coming soon. Got feedback?{' '}
            <a
              href="https://chat.whatsapp.com/IDWsZR85kk49AaS1320Jrj"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              Join our WhatsApp Community
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
