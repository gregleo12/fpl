'use client';

import { useState } from 'react';
import styles from './ClassicWaitlistBanner.module.css';

export default function ClassicWaitlistBanner() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/waitlist/classic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  if (status === 'success') {
    return (
      <div className={styles.banner}>
        <div className={styles.successMessage}>
          ✅ Thanks! We'll notify you when Classic Leagues launch.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.banner}>
      <div className={styles.header}>
        <span className={styles.icon}>🏆</span>
        <span className={styles.title}>Got a Classic League?</span>
      </div>

      <p className={styles.description}>
        Classic League support coming soon. Get notified when it launches.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          disabled={status === 'loading'}
          required
        />
        <button
          type="submit"
          className={styles.button}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? '...' : 'Notify Me'}
        </button>
      </form>

      {status === 'error' && (
        <p className={styles.error}>{errorMessage}</p>
      )}

      <p className={styles.privacy}>
        We'll only email you when it launches. No spam.
      </p>
    </div>
  );
}
