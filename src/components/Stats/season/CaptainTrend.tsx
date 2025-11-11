'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { CaptainTrendData } from '../SeasonView';
import styles from './TrendChart.module.css';

interface Props {
  data: CaptainTrendData[];
}

const COLORS = ['#00ff87', '#a78bfa', '#60a5fa', '#f472b6', '#fbbf24', '#34d399', '#fb923c', '#f87171'];

export function CaptainTrend({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>⭐ Captain Trends</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>⭐ Captain Trends</h4>
      <div className={styles.subtitle}>Most captained player per gameweek</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Selections', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.5)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(26, 26, 46, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff'
              }}
              labelStyle={{ color: '#00ff87', fontWeight: 600 }}
              formatter={(value: any, name: string, props: any) => {
                return [value, props.payload.captain];
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} name="Captain">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Captain Legend */}
      <div className={styles.captainList}>
        {data.map((item, index) => (
          <div key={item.gameweek} className={styles.captainItem}>
            <div className={styles.captainDot} style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className={styles.captainGW}>GW{item.gameweek}:</span>
            <span className={styles.captainName}>{item.captain}</span>
            <span className={styles.captainCount}>({item.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
