export interface LiveMatchData {
  gameweek: number;
  player1: {
    entryId: number;
    manager: string;
    team: string;
    currentScore: number;
    playersPlayed: number;
    playersRemaining: number;
    captain: {
      name: string;
      points: number;
      isPlaying: boolean;
    };
    chipActive: string | null; // 'bboost', 'freehit', '3xc', 'wildcard'
    benchPoints: number;
  };
  player2: {
    entryId: number;
    manager: string;
    team: string;
    currentScore: number;
    playersPlayed: number;
    playersRemaining: number;
    captain: {
      name: string;
      points: number;
      isPlaying: boolean;
    };
    chipActive: string | null;
    benchPoints: number;
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
