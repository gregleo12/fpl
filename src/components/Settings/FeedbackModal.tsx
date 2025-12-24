'use client';

import { X } from 'lucide-react';
import styles from './FeedbackModal.module.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    window.open('https://chat.whatsapp.com/IDWsZR85kk49AaS1320Jrj', '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('RivalFPL Feedback');
    const body = encodeURIComponent('Hi Greg,\n\n');
    window.location.href = `mailto:greg@rivalfpl.com?subject=${subject}&body=${body}`;
    onClose();
  };

  const handleReddit = () => {
    window.open('https://reddit.com/r/RivalFPL', '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Send Feedback</h3>
          <button onClick={onClose} className={styles.closeButton} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className={styles.description}>
          Choose how you'd like to share your feedback, bug reports, or feature requests:
        </p>

        <div className={styles.options}>
          <button onClick={handleWhatsApp} className={styles.option}>
            <span className={styles.optionIcon}>💬</span>
            <div className={styles.optionContent}>
              <div className={styles.optionTitle}>WhatsApp Community</div>
              <div className={styles.optionDescription}>Quick chat with other users & Greg</div>
            </div>
          </button>

          <button onClick={handleEmail} className={styles.option}>
            <span className={styles.optionIcon}>📧</span>
            <div className={styles.optionContent}>
              <div className={styles.optionTitle}>Email</div>
              <div className={styles.optionDescription}>greg@rivalfpl.com</div>
            </div>
          </button>

          <button onClick={handleReddit} className={styles.option}>
            <span className={styles.optionIcon}>💬</span>
            <div className={styles.optionContent}>
              <div className={styles.optionTitle}>Reddit</div>
              <div className={styles.optionDescription}>r/RivalFPL community</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
