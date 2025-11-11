'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChipTrendData } from '../SeasonView';
import styles from './TrendChart.module.css';

interface Props {
  data: ChipTrendData[];
}

export function ChipsTrend({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>🎮 Chip Usage</h4>
        <div className={styles.noData}>No chips played yet</div>
      </div>
    );
  }

  // Filter out gameweeks with no chip usage
  const activeData = data.filter(gw =>
    gw.bboost > 0 || gw['3xc'] > 0 || gw.freehit > 0 || gw.wildcard > 0
  );

  if (activeData.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>🎮 Chip Usage</h4>
        <div className={styles.noData}>No chips played yet</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>🎮 Chip Usage</h4>
      <div className={styles.subtitle}>Chips played per gameweek</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={activeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="gameweek"
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              label={{ value: 'Gameweek', position: 'insideBottom', offset: -5, fill: 'rgba(255, 255, 255, 0.5)' }}
            />
            <YAxis
              stroke="rgba(255, 255, 255, 0.5)"
              tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }}
              label={{ value: 'Usage Count', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.5)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelStyle={{ color: '#00ff87', fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => {
                const names: Record<string, string> = {
                  'bboost': 'Bench Boost',
                  '3xc': 'Triple Captain',
                  'freehit': 'Free Hit',
                  'wildcard': 'Wildcard'
                };
                return names[value] || value;
              }}
            />
            <Bar dataKey="bboost" stackId="a" fill="#00ff87" radius={[0, 0, 0, 0]} name="bboost" />
            <Bar dataKey="3xc" stackId="a" fill="#a78bfa" radius={[0, 0, 0, 0]} name="3xc" />
            <Bar dataKey="freehit" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} name="freehit" />
            <Bar dataKey="wildcard" stackId="a" fill="#fbbf24" radius={[8, 8, 0, 0]} name="wildcard" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
