'use client';
import { useEffect } from 'react';
import styles from './FullRankingModal.module.css';

interface FullRankingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon: string;
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
}

export function FullRankingModal({
  isOpen,
  onClose,
  title,
  icon,
  data,
  renderItem
}: FullRankingModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>
            <span className={styles.icon}>{icon}</span>
            {title}
          </h3>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {data.length === 0 ? (
            <div className={styles.empty}>No data available</div>
          ) : (
            <div className={styles.list}>
              {data.map((item, index) => (
                <div key={item.entry_id || index}>
                  {renderItem(item, index)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
