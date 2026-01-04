'use client';

import styles from './ModeToggle.module.css';

interface ModeToggleProps {
  mode: 'fame' | 'shame';
  onChange: (mode: 'fame' | 'shame') => void;
}

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className={styles.modeToggleContainer}>
      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeButton} ${mode === 'fame' ? styles.active : ''}`}
          onClick={() => onChange('fame')}
          aria-label="Show Fame Awards"
        >
          🏆 Achievements
        </button>
        <button
          className={`${styles.modeButton} ${mode === 'shame' ? styles.active : ''} ${mode === 'shame' ? styles.shame : ''}`}
          onClick={() => onChange('shame')}
          aria-label="Show Shame Awards"
        >
          💀 Dubious Honors
        </button>
      </div>
    </div>
  );
}
