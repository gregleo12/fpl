export interface CompletedMatchData {
  gameweek: number;
  player1: {
    entryId: number;
    manager: string;
    team: string;
    finalScore: number;
    captain: string;
    transferCost: number;
    chipUsed: string | null;
  };
  player2: {
    entryId: number;
    manager: string;
    team: string;
    finalScore: number;
    captain: string;
    transferCost: number;
    chipUsed: string | null;
  };
  winner: 'player1' | 'player2' | 'draw';
  margin: number;
}

export interface MatchStory {
  summary: string;
  keyFactor: string;
  benchMention?: string;
}
