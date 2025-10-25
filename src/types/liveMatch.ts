export interface DifferentialPlayer {
  name: string;
  points: number;
  position: number; // 1-11 starting, 12-15 bench
  isCaptain: boolean;
}

export interface LiveMatchData {
  gameweek: number;
  player1: {
    entryId: number;
    manager: string;
    team: string;
    currentScore: number;
    playersPlayed: number;
    playersRemaining: number;
    totalPlayers: number; // 11 normally, 15 for Bench Boost
    captain: {
      name: string;
      points: number;
      isPlaying: boolean;
    };
    chipActive: string | null; // 'bboost', 'freehit', '3xc', 'wildcard'
    benchPoints: number;
    transferCost: number;
    differentials: DifferentialPlayer[];
  };
  player2: {
    entryId: number;
    manager: string;
    team: string;
    currentScore: number;
    playersPlayed: number;
    playersRemaining: number;
    totalPlayers: number; // 11 normally, 15 for Bench Boost
    captain: {
      name: string;
      points: number;
      isPlaying: boolean;
    };
    chipActive: string | null;
    benchPoints: number;
    transferCost: number;
    differentials: DifferentialPlayer[];
  };
}

export interface WinRequirements {
  status: 'winning' | 'losing' | 'drawing';
  margin: number;
  pointsNeeded: number;
  avgPerPlayer: number;
  opponentAvgNeeded: number;
  message: string;
}
