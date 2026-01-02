'use client';

import { useState, useEffect } from 'react';
import { X, Filter, Check } from 'lucide-react';
import styles from './OwnershipFilterModal.module.css';

export interface FilterState {
  priceMin: number;
  priceMax: number;
  positions: number[];
  teams: number[];
  availability: 'all' | 'available' | 'unavailable';
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApplyFilters: (filters: FilterState) => void;
  teams: Array<{ id: number; name: string; short_name: string }>;
}

const POSITIONS = [
  { id: 1, label: 'GKP', color: { bg: '#f4d03f', text: '#000' } },
  { id: 2, label: 'DEF', color: { bg: '#00ff87', text: '#000' } },
  { id: 3, label: 'MID', color: { bg: '#05f0ff', text: '#000' } },
  { id: 4, label: 'FWD', color: { bg: '#e74c3c', text: '#fff' } },
];

export function FilterModal({ isOpen, onClose, filters, onApplyFilters, teams }: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  if (!isOpen) return null;

  const togglePosition = (positionId: number) => {
    setLocalFilters(prev => ({
      ...prev,
      positions: prev.positions.includes(positionId)
        ? prev.positions.filter(id => id !== positionId)
        : [...prev.positions, positionId]
    }));
  };

  const toggleTeam = (teamId: number) => {
    setLocalFilters(prev => ({
      ...prev,
      teams: prev.teams.includes(teamId)
        ? prev.teams.filter(id => id !== teamId)
        : [...prev.teams, teamId]
    }));
  };

  const selectAllPositions = () => {
    setLocalFilters(prev => ({
      ...prev,
      positions: [1, 2, 3, 4]
    }));
  };

  const unselectAllPositions = () => {
    setLocalFilters(prev => ({
      ...prev,
      positions: []
    }));
  };

  const selectAllTeams = () => {
    setLocalFilters(prev => ({
      ...prev,
      teams: teams.map(t => t.id)
    }));
  };

  const unselectAllTeams = () => {
    setLocalFilters(prev => ({
      ...prev,
      teams: []
    }));
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      priceMin: 3.8,
      priceMax: 15.0,
      positions: [1, 2, 3, 4],
      teams: teams.map(t => t.id),
      availability: 'all'
    };
    setLocalFilters(resetFilters);
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>
            <Filter size={20} />
            Filter Players
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.content}>
          {/* Price Range */}
          <section className={styles.section}>
            <h3>Price Range</h3>
            <div className={styles.priceRange}>
              <div className={styles.priceInputs}>
                <div className={styles.priceInput}>
                  <label>Min</label>
                  <input
                    type="number"
                    min={3.8}
                    max={localFilters.priceMax}
                    step={0.1}
                    value={localFilters.priceMin}
                    onChange={e => setLocalFilters(prev => ({
                      ...prev,
                      priceMin: Math.max(3.8, Math.min(parseFloat(e.target.value) || 3.8, prev.priceMax))
                    }))}
                  />
                  <span>m</span>
                </div>
                <span className={styles.priceSeparator}>-</span>
                <div className={styles.priceInput}>
                  <label>Max</label>
                  <input
                    type="number"
                    min={localFilters.priceMin}
                    max={15.0}
                    step={0.1}
                    value={localFilters.priceMax}
                    onChange={e => setLocalFilters(prev => ({
                      ...prev,
                      priceMax: Math.min(15.0, Math.max(parseFloat(e.target.value) || 15.0, prev.priceMin))
                    }))}
                  />
                  <span>m</span>
                </div>
              </div>
              <div className={styles.sliders}>
                <input
                  type="range"
                  min={3.8}
                  max={15.0}
                  step={0.1}
                  value={localFilters.priceMin}
                  onChange={e => setLocalFilters(prev => ({
                    ...prev,
                    priceMin: Math.min(parseFloat(e.target.value), prev.priceMax - 0.1)
                  }))}
                  className={styles.rangeMin}
                />
                <input
                  type="range"
                  min={3.8}
                  max={15.0}
                  step={0.1}
                  value={localFilters.priceMax}
                  onChange={e => setLocalFilters(prev => ({
                    ...prev,
                    priceMax: Math.max(parseFloat(e.target.value), prev.priceMin + 0.1)
                  }))}
                  className={styles.rangeMax}
                />
              </div>
            </div>
          </section>

          {/* Positions */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Positions</h3>
              <div className={styles.bulkActions}>
                <button onClick={selectAllPositions} className={styles.bulkButton}>
                  All
                </button>
                <button onClick={unselectAllPositions} className={styles.bulkButton}>
                  None
                </button>
              </div>
              <span className={styles.count}>{localFilters.positions.length}/4</span>
            </div>
            <div className={styles.positionsGrid}>
              {POSITIONS.map(position => {
                const selected = localFilters.positions.includes(position.id);
                return (
                  <button
                    key={position.id}
                    className={`${styles.positionBadge} ${selected ? styles.selected : ''}`}
                    style={{
                      backgroundColor: selected ? position.color.bg : 'transparent',
                      color: selected ? position.color.text : '#fff',
                      borderColor: position.color.bg
                    }}
                    onClick={() => togglePosition(position.id)}
                  >
                    <span>{position.label}</span>
                    {selected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Teams */}
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Teams</h3>
              <div className={styles.bulkActions}>
                <button onClick={selectAllTeams} className={styles.bulkButton}>
                  All
                </button>
                <button onClick={unselectAllTeams} className={styles.bulkButton}>
                  None
                </button>
              </div>
              <span className={styles.count}>{localFilters.teams.length}/20</span>
            </div>
            <div className={styles.teamsGrid}>
              {teams.sort((a, b) => a.short_name.localeCompare(b.short_name)).map(team => {
                const selected = localFilters.teams.includes(team.id);
                return (
                  <button
                    key={team.id}
                    className={`${styles.teamBadge} ${selected ? styles.selected : ''}`}
                    onClick={() => toggleTeam(team.id)}
                    title={team.name}
                  >
                    <span>{team.short_name}</span>
                    {selected && <Check size={12} className={styles.checkmark} />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Availability */}
          <section className={styles.section}>
            <h3>Availability</h3>
            <div className={styles.availabilityGrid}>
              <button
                className={`${styles.availabilityButton} ${localFilters.availability === 'all' ? styles.selected : ''}`}
                onClick={() => setLocalFilters(prev => ({ ...prev, availability: 'all' }))}
              >
                <span>All Players</span>
                {localFilters.availability === 'all' && <Check size={14} />}
              </button>
              <button
                className={`${styles.availabilityButton} ${localFilters.availability === 'available' ? styles.selected : ''}`}
                onClick={() => setLocalFilters(prev => ({ ...prev, availability: 'available' }))}
              >
                <span>Available Only</span>
                {localFilters.availability === 'available' && <Check size={14} />}
              </button>
              <button
                className={`${styles.availabilityButton} ${localFilters.availability === 'unavailable' ? styles.selected : ''}`}
                onClick={() => setLocalFilters(prev => ({ ...prev, availability: 'unavailable' }))}
              >
                <span>Unavailable/Injured</span>
                {localFilters.availability === 'unavailable' && <Check size={14} />}
              </button>
            </div>
          </section>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={handleReset}>
            Reset
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
}
