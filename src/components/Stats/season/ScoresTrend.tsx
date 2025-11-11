'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ScoreTrendData } from '../SeasonView';
import styles from './TrendChart.module.css';

interface Props {
  data: ScoreTrendData[];
}

export function ScoresTrend({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className={styles.card}>
        <h4 className={styles.cardTitle}>📊 Score Trends</h4>
        <div className={styles.noData}>No data available</div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>📊 Score Trends</h4>
      <div className={styles.subtitle}>Average, highest, and lowest scores per gameweek</div>
      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Points', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.5)' }}
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
              iconType="line"
            />
            <Line
              type="monotone"
              dataKey="highest"
              stroke="#00ff87"
              strokeWidth={2}
              dot={{ fill: '#00ff87', r: 3 }}
              activeDot={{ r: 5 }}
              name="Highest"
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={{ fill: '#a78bfa', r: 3 }}
              activeDot={{ r: 5 }}
              name="Average"
            />
            <Line
              type="monotone"
              dataKey="lowest"
              stroke="#ff6b6b"
              strokeWidth={2}
              dot={{ fill: '#ff6b6b', r: 3 }}
              activeDot={{ r: 5 }}
              name="Lowest"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
