/**
 * K-163f: Luck System V2 - Four Components
 * K-163N: Refactored to use shared calculateSeasonLuckIndex function
 *
 * Per-GW Components (apply every match):
 * 1. Variance Luck (zero-sum per match)
 * 2. Rank Luck (not zero-sum)
 *
 * Seasonal Components (calculated once per season):
 * 3. Schedule Luck (zero-sum)
 * 4. Chip Luck (zero-sum)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { calculateSeasonLuckIndex } from '@/lib/luckCalculator';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leagueId = parseInt(params.id);
    if (isNaN(leagueId)) {
      return NextResponse.json({ error: 'Invalid league ID' }, { status: 400 });
    }

    const db = await getDatabase();

    // K-163N: Use shared calculation function (single source of truth)
    const luckResultsMap = await calculateSeasonLuckIndex(leagueId, db);

    // Convert Map to array and sort by season luck index descending
    const managersData = Array.from(luckResultsMap.values()).sort(
      (a, b) => b.season_luck_index - a.season_luck_index
    );

    // Get current GW for response metadata
    const gwPointsResult = await db.query(`
      SELECT MAX(event) as current_gw
      FROM manager_gw_history
      WHERE league_id = $1
    `, [leagueId]);
    const currentGW = gwPointsResult.rows[0]?.current_gw || 0;

    // Calculate league totals for validation
    const leagueTotals = {
      variance_sum: parseFloat(managersData.reduce((sum, m) => sum + m.variance_luck.total, 0).toFixed(2)),
      rank_sum: parseFloat(managersData.reduce((sum, m) => sum + m.rank_luck.total, 0).toFixed(4)),
      schedule_sum: parseFloat(managersData.reduce((sum, m) => sum + m.schedule_luck.value, 0).toFixed(2)),
      chip_sum: parseFloat(managersData.reduce((sum, m) => sum + m.chip_luck.value, 0).toFixed(2))
    };

    // Calculate per-GW sums
    // Get all unique GWs from the data
    const allGWs = Array.from(
      new Set(
        managersData.flatMap(m => m.variance_luck.per_gw.map((g: any) => g.gw))
      )
    ).sort((a, b) => a - b);

    const perGWSums: any[] = [];
    for (const gw of allGWs) {
      const gwVarianceSum = managersData.reduce((sum, m) => {
        const gwData = m.variance_luck.per_gw.find((g: any) => g.gw === gw);
        return sum + (gwData?.value || 0);
      }, 0);

      const gwRankSum = managersData.reduce((sum, m) => {
        const gwData = m.rank_luck.per_gw.find((g: any) => g.gw === gw);
        return sum + (gwData?.value || 0);
      }, 0);

      perGWSums.push({
        gw,
        variance_sum: parseFloat(gwVarianceSum.toFixed(2)),
        rank_sum: parseFloat(gwRankSum.toFixed(4))
      });
    }

    // K-163L: Validate zero-sum property for schedule luck
    const totalScheduleLuck = managersData.reduce((sum, m) => sum + m.schedule_luck.value, 0);
    const scheduleLuckIsZeroSum = Math.abs(totalScheduleLuck) < 0.01;

    console.log('[K-163L Zero-Sum Validation]', {
      totalScheduleLuck: parseFloat(totalScheduleLuck.toFixed(4)),
      isZeroSum: scheduleLuckIsZeroSum,
      expectedSum: 0,
      tolerance: 0.01
    });

    if (!scheduleLuckIsZeroSum) {
      console.warn('[K-163L] WARNING: Schedule luck does not sum to zero!', {
        totalScheduleLuck,
        expected: 0
      });
    }

    return NextResponse.json({
      leagueId,
      currentGW,
      managers: managersData,
      league_totals: leagueTotals,
      per_gw_sums: perGWSums,
      weights: {
        gw_luck: { variance: 0.6, rank: 0.4 },
        season_luck: { variance: 0.4, rank: 0.3, schedule: 0.2, chip: 0.1 }
      },
      normalization: {
        variance: '÷ 10',
        rank: '× 1',
        schedule: '÷ 5',
        chip: '÷ 3'
      }
    });

  } catch (error: any) {
    console.error('Error calculating luck:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to calculate luck' },
      { status: 500 }
    );
  }
}
