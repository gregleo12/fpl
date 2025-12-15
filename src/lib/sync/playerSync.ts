import { getDatabase } from '@/lib/db';

const FPL_BOOTSTRAP_URL = 'https://fantasy.premierleague.com/api/bootstrap-static/';
const FPL_ELEMENT_URL = 'https://fantasy.premierleague.com/api/element-summary/';

interface SyncResult {
  playersUpdated: number;
  gameweekStatsUpdated: number;
  errors: string[];
}

export async function syncPlayers(): Promise<SyncResult> {
  const result: SyncResult = {
    playersUpdated: 0,
    gameweekStatsUpdated: 0,
    errors: []
  };

  try {
    // 1. Fetch bootstrap data
    console.log('[Player Sync] Fetching bootstrap data...');
    const bootstrapRes = await fetch(FPL_BOOTSTRAP_URL);
    if (!bootstrapRes.ok) throw new Error('Failed to fetch bootstrap data');

    const bootstrap = await bootstrapRes.json();
    const elements = bootstrap.elements || [];
    const teams = bootstrap.teams || [];

    console.log(`[Player Sync] Found ${elements.length} players and ${teams.length} teams`);

    const db = await getDatabase();

    // 2. Build team lookup
    const teamMap = new Map();
    for (const team of teams) {
      teamMap.set(team.id, {
        name: team.name,
        short: team.short_name
      });
    }

    // 3. Upsert teams
    console.log('[Player Sync] Upserting teams...');
    for (const team of teams) {
      await db.query(`
        INSERT INTO teams (id, name, short_name, strength,
          strength_overall_home, strength_overall_away,
          strength_attack_home, strength_attack_away,
          strength_defence_home, strength_defence_away)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          short_name = EXCLUDED.short_name,
          strength = EXCLUDED.strength,
          strength_overall_home = EXCLUDED.strength_overall_home,
          strength_overall_away = EXCLUDED.strength_overall_away,
          strength_attack_home = EXCLUDED.strength_attack_home,
          strength_attack_away = EXCLUDED.strength_attack_away,
          strength_defence_home = EXCLUDED.strength_defence_home,
          strength_defence_away = EXCLUDED.strength_defence_away
      `, [
        team.id, team.name, team.short_name, team.strength,
        team.strength_overall_home, team.strength_overall_away,
        team.strength_attack_home, team.strength_attack_away,
        team.strength_defence_home, team.strength_defence_away
      ]);
    }

    // 4. Position mapping
    const positionMap: Record<number, string> = {
      1: 'GKP',
      2: 'DEF',
      3: 'MID',
      4: 'FWD'
    };

    // 5. Upsert each player
    console.log('[Player Sync] Upserting players...');
    for (const el of elements) {
      const team = teamMap.get(el.team);

      await db.query(`
        INSERT INTO players (
          id, web_name, first_name, second_name,
          team_id, team_name, team_short, element_type, position,
          now_cost, selected_by_percent, transfers_in, transfers_out,
          transfers_in_event, transfers_out_event,
          total_points, points_per_game, form,
          minutes, starts, goals_scored, assists,
          expected_goals, expected_assists, expected_goal_involvements,
          clean_sheets, goals_conceded, expected_goals_conceded, own_goals,
          saves, penalties_saved, yellow_cards, red_cards, penalties_missed,
          bonus, bps, influence, creativity, threat, ict_index,
          status, chance_of_playing_next_round, news, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
          $41, $42, $43, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          web_name = EXCLUDED.web_name,
          first_name = EXCLUDED.first_name,
          second_name = EXCLUDED.second_name,
          team_id = EXCLUDED.team_id,
          team_name = EXCLUDED.team_name,
          team_short = EXCLUDED.team_short,
          now_cost = EXCLUDED.now_cost,
          selected_by_percent = EXCLUDED.selected_by_percent,
          transfers_in = EXCLUDED.transfers_in,
          transfers_out = EXCLUDED.transfers_out,
          transfers_in_event = EXCLUDED.transfers_in_event,
          transfers_out_event = EXCLUDED.transfers_out_event,
          total_points = EXCLUDED.total_points,
          points_per_game = EXCLUDED.points_per_game,
          form = EXCLUDED.form,
          minutes = EXCLUDED.minutes,
          starts = EXCLUDED.starts,
          goals_scored = EXCLUDED.goals_scored,
          assists = EXCLUDED.assists,
          expected_goals = EXCLUDED.expected_goals,
          expected_assists = EXCLUDED.expected_assists,
          expected_goal_involvements = EXCLUDED.expected_goal_involvements,
          clean_sheets = EXCLUDED.clean_sheets,
          goals_conceded = EXCLUDED.goals_conceded,
          expected_goals_conceded = EXCLUDED.expected_goals_conceded,
          own_goals = EXCLUDED.own_goals,
          saves = EXCLUDED.saves,
          penalties_saved = EXCLUDED.penalties_saved,
          yellow_cards = EXCLUDED.yellow_cards,
          red_cards = EXCLUDED.red_cards,
          penalties_missed = EXCLUDED.penalties_missed,
          bonus = EXCLUDED.bonus,
          bps = EXCLUDED.bps,
          influence = EXCLUDED.influence,
          creativity = EXCLUDED.creativity,
          threat = EXCLUDED.threat,
          ict_index = EXCLUDED.ict_index,
          status = EXCLUDED.status,
          chance_of_playing_next_round = EXCLUDED.chance_of_playing_next_round,
          news = EXCLUDED.news,
          updated_at = NOW()
      `, [
        el.id, el.web_name, el.first_name, el.second_name,
        el.team, team?.name, team?.short, el.element_type, positionMap[el.element_type],
        el.now_cost, parseFloat(el.selected_by_percent) || 0, el.transfers_in || 0, el.transfers_out || 0,
        el.transfers_in_event || 0, el.transfers_out_event || 0,
        el.total_points || 0, parseFloat(el.points_per_game) || 0, parseFloat(el.form) || 0,
        el.minutes || 0, el.starts || 0, el.goals_scored || 0, el.assists || 0,
        parseFloat(el.expected_goals) || 0, parseFloat(el.expected_assists) || 0,
        parseFloat(el.expected_goal_involvements) || 0,
        el.clean_sheets || 0, el.goals_conceded || 0, parseFloat(el.expected_goals_conceded) || 0, el.own_goals || 0,
        el.saves || 0, el.penalties_saved || 0, el.yellow_cards || 0, el.red_cards || 0, el.penalties_missed || 0,
        el.bonus || 0, el.bps || 0, parseFloat(el.influence) || 0, parseFloat(el.creativity) || 0,
        parseFloat(el.threat) || 0, parseFloat(el.ict_index) || 0,
        el.status, el.chance_of_playing_next_round, el.news || null
      ]);

      result.playersUpdated++;
    }

    console.log(`[Player Sync] ✓ Updated ${result.playersUpdated} players`);

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(msg);
    console.error('[Player Sync] Error:', msg);
  }

  return result;
}

// Sync detailed per-GW history for a specific player
export async function syncPlayerHistory(playerId: number): Promise<number> {
  try {
    console.log(`[Player History Sync] Fetching history for player ${playerId}...`);

    const res = await fetch(`${FPL_ELEMENT_URL}${playerId}/`);
    if (!res.ok) throw new Error(`Failed to fetch player ${playerId}`);

    const data = await res.json();
    const history = data.history || [];

    console.log(`[Player History Sync] Found ${history.length} gameweeks for player ${playerId}`);

    const db = await getDatabase();

    // Get team lookup
    const teamsRes = await db.query('SELECT id, short_name FROM teams');
    const teamMap = new Map(teamsRes.rows.map((t: any) => [t.id, t.short_name]));

    let updated = 0;

    for (const h of history) {
      await db.query(`
        INSERT INTO player_gameweek_stats (
          player_id, gameweek, fixture_id, opponent_team_id, opponent_short,
          was_home, team_goals, opponent_goals, total_points, minutes, starts,
          goals_scored, assists, expected_goals, expected_assists, expected_goal_involvements,
          clean_sheets, goals_conceded, expected_goals_conceded, own_goals,
          saves, penalties_saved, yellow_cards, red_cards, penalties_missed,
          bonus, bps, influence, creativity, threat, ict_index,
          value, transfers_in, transfers_out, selected, defensive_contribution
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36
        )
        ON CONFLICT (player_id, gameweek) DO UPDATE SET
          total_points = EXCLUDED.total_points,
          minutes = EXCLUDED.minutes,
          goals_scored = EXCLUDED.goals_scored,
          assists = EXCLUDED.assists,
          expected_goals = EXCLUDED.expected_goals,
          expected_assists = EXCLUDED.expected_assists,
          expected_goal_involvements = EXCLUDED.expected_goal_involvements,
          clean_sheets = EXCLUDED.clean_sheets,
          goals_conceded = EXCLUDED.goals_conceded,
          bonus = EXCLUDED.bonus,
          bps = EXCLUDED.bps,
          influence = EXCLUDED.influence,
          creativity = EXCLUDED.creativity,
          threat = EXCLUDED.threat,
          ict_index = EXCLUDED.ict_index,
          value = EXCLUDED.value,
          transfers_in = EXCLUDED.transfers_in,
          transfers_out = EXCLUDED.transfers_out,
          selected = EXCLUDED.selected,
          defensive_contribution = EXCLUDED.defensive_contribution
      `, [
        playerId, h.round, h.fixture, h.opponent_team, teamMap.get(h.opponent_team) || null,
        h.was_home, h.team_h_score || 0, h.team_a_score || 0, h.total_points || 0, h.minutes || 0, h.starts || 0,
        h.goals_scored || 0, h.assists || 0, parseFloat(h.expected_goals) || 0,
        parseFloat(h.expected_assists) || 0, parseFloat(h.expected_goal_involvements) || 0,
        h.clean_sheets || 0, h.goals_conceded || 0, parseFloat(h.expected_goals_conceded) || 0, h.own_goals || 0,
        h.saves || 0, h.penalties_saved || 0, h.yellow_cards || 0, h.red_cards || 0, h.penalties_missed || 0,
        h.bonus || 0, h.bps || 0, parseFloat(h.influence) || 0, parseFloat(h.creativity) || 0,
        parseFloat(h.threat) || 0, parseFloat(h.ict_index) || 0,
        h.value || 0, h.transfers_in || 0, h.transfers_out || 0, h.selected || 0, h.defensive_contribution || 0
      ]);

      updated++;
    }

    console.log(`[Player History Sync] ✓ Updated ${updated} gameweeks for player ${playerId}`);
    return updated;

  } catch (error) {
    console.error(`[Player History Sync] Error for player ${playerId}:`, error);
    return 0;
  }
}
