'use client';

import { useState, useEffect } from 'react';
import styles from './CollapsibleSection.module.css';

interface CollapsibleSectionProps {
  title: string;
  defaultExpanded?: boolean;
  storageKey?: string; // For localStorage persistence
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultExpanded = false,
  storageKey,
  children
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Load state from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        setIsExpanded(stored === 'true');
      }
    }
  }, [storageKey]);

  // Save state to localStorage when changed
  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (storageKey) {
      localStorage.setItem(storageKey, String(newState));
    }
  };

  return (
    <div className={styles.collapsibleSection}>
      <button
        className={styles.header}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${title}`}
      >
        <span className={styles.arrow}>
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className={styles.title}>{title}</span>
      </button>

      {isExpanded && (
        <div className={styles.content}>
          {children}
        </div>
      )}
    </div>
  );
}
