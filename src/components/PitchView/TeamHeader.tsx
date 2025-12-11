'use client';

import styles from './TeamHeader.module.css';

interface Props {
  managerName: string;
  teamName: string;
}

export function TeamHeader({ managerName, teamName }: Props) {
  return (
    <div className={styles.teamHeader}>
      <h2 className={styles.managerName}>{managerName}</h2>
      <p className={styles.teamName}>{teamName}</p>
    </div>
  );
}
