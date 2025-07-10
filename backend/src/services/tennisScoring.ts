import { ITennisScore, ISetScore } from '../models/Match';

export class TennisScoringService {
  private static readonly POINTS_SEQUENCE = [0, 15, 30, 40];
  private static readonly GAMES_TO_WIN_SET = 6;
  private static readonly TIEBREAK_TO_WIN = 7;
  private static readonly SETS_TO_WIN_BEST_OF_3 = 2;
  private static readonly SETS_TO_WIN_BEST_OF_5 = 3;

  /**
   * Award a point to the specified team and update the tennis score
   */
  static awardPoint(score: ITennisScore, pointWinner: 'team1' | 'team2', matchFormat: 'best-of-3' | 'best-of-5' = 'best-of-3', gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10' = 'regular'): ITennisScore {
    // Create a deep copy to avoid mutating the original
    const updatedScore = { ...score };
    updatedScore.sets = score.sets.map(set => ({ ...set }));

    // If match is already won, don't update
    if (updatedScore.winner) {
      return updatedScore;
    }

    // Handle different game formats
    switch (gameFormat) {
      case 'tiebreak-8':
        return this.awardTiebreak8Point(updatedScore, pointWinner);
      case 'tiebreak-10':
        return this.awardTiebreak10Point(updatedScore, pointWinner);
      case 'regular':
      default:
        // Check if we're in a tiebreak for regular tennis
        const currentSet = this.getCurrentSet(updatedScore);
        if (currentSet?.isTiebreak) {
          return this.awardTiebreakPoint(updatedScore, pointWinner, matchFormat);
        }
        // Regular game scoring
        return this.awardRegularPoint(updatedScore, pointWinner, matchFormat);
    }
  }

  /**
   * Award a point in regular game play
   */
  private static awardRegularPoint(score: ITennisScore, pointWinner: 'team1' | 'team2', matchFormat: 'best-of-3' | 'best-of-5'): ITennisScore {
    const opponent = pointWinner === 'team1' ? 'team2' : 'team1';
    
    // Current points
    const currentPoints = pointWinner === 'team1' ? score.team1Points : score.team2Points;
    const opponentPoints = pointWinner === 'team1' ? score.team2Points : score.team1Points;

    // Handle deuce situations
    if (score.isDeuce) {
      if (score.advantage === pointWinner) {
        // Point winner already has advantage, they win the game
        return this.winGame(score, pointWinner, matchFormat);
      } else if (score.advantage === opponent) {
        // Opponent had advantage, back to deuce
        score.advantage = null;
        score.isDeuce = true;
      } else {
        // No advantage, give advantage to point winner
        score.advantage = pointWinner;
        score.isDeuce = false;
      }
      return score;
    }

    // Regular point progression
    if (currentPoints < 40) {
      // Normal point progression: 0 -> 15 -> 30 -> 40
      const currentIndex = this.POINTS_SEQUENCE.indexOf(currentPoints);
      const newPoints = this.POINTS_SEQUENCE[currentIndex + 1];
      
      if (pointWinner === 'team1') {
        score.team1Points = newPoints;
      } else {
        score.team2Points = newPoints;
      }
    } else if (currentPoints === 40) {
      if (opponentPoints === 40) {
        // Both at 40, go to deuce
        score.isDeuce = true;
        score.advantage = pointWinner;
      } else {
        // Point winner wins the game
        return this.winGame(score, pointWinner, matchFormat);
      }
    }

    return score;
  }

  /**
   * Award a point in tiebreak
   */
  private static awardTiebreakPoint(score: ITennisScore, pointWinner: 'team1' | 'team2', matchFormat: 'best-of-3' | 'best-of-5'): ITennisScore {
    const currentSet = this.getCurrentSet(score);
    if (!currentSet) return score;

    // Increment tiebreak score
    if (pointWinner === 'team1') {
      currentSet.team1Tiebreak = (currentSet.team1Tiebreak || 0) + 1;
    } else {
      currentSet.team2Tiebreak = (currentSet.team2Tiebreak || 0) + 1;
    }

    // Check if tiebreak is won
    const team1Tiebreak = currentSet.team1Tiebreak || 0;
    const team2Tiebreak = currentSet.team2Tiebreak || 0;

    if ((team1Tiebreak >= this.TIEBREAK_TO_WIN && team1Tiebreak - team2Tiebreak >= 2) ||
        (team2Tiebreak >= this.TIEBREAK_TO_WIN && team2Tiebreak - team1Tiebreak >= 2)) {
      // Tiebreak won, complete the set
      return this.winSet(score, pointWinner, matchFormat);
    }

    return score;
  }

  /**
   * Award a point in 8-game tiebreak format
   */
  private static awardTiebreak8Point(score: ITennisScore, pointWinner: 'team1' | 'team2'): ITennisScore {
    // In 8-game tiebreak, games act like tiebreak points
    if (pointWinner === 'team1') {
      score.team1Games++;
    } else {
      score.team2Games++;
    }

    // Check if match is won (first to 8 games with 2-game margin)
    const team1Games = score.team1Games;
    const team2Games = score.team2Games;

    if ((team1Games >= 8 && team1Games - team2Games >= 2) ||
        (team2Games >= 8 && team2Games - team1Games >= 2)) {
      // Match won!
      score.winner = pointWinner;
      score.isMatchPoint = false;
      score.isSetPoint = false;
      
      // Complete the single set
      const currentSet = this.getCurrentSet(score);
      if (currentSet) {
        currentSet.isCompleted = true;
        currentSet.team1Games = team1Games;
        currentSet.team2Games = team2Games;
      }
    } else {
      // Update match point status
      const team1OnMatchPoint = team1Games >= 7 && team1Games >= team2Games;
      const team2OnMatchPoint = team2Games >= 7 && team2Games >= team1Games;
      score.isMatchPoint = team1OnMatchPoint || team2OnMatchPoint;
    }

    return score;
  }

  /**
   * Award a point in 10-game tiebreak format
   */
  private static awardTiebreak10Point(score: ITennisScore, pointWinner: 'team1' | 'team2'): ITennisScore {
    // In 10-game tiebreak, games act like tiebreak points
    if (pointWinner === 'team1') {
      score.team1Games++;
    } else {
      score.team2Games++;
    }

    // Check if match is won (first to 10 games with 2-game margin)
    const team1Games = score.team1Games;
    const team2Games = score.team2Games;

    if ((team1Games >= 10 && team1Games - team2Games >= 2) ||
        (team2Games >= 10 && team2Games - team1Games >= 2)) {
      // Match won!
      score.winner = pointWinner;
      score.isMatchPoint = false;
      score.isSetPoint = false;
      
      // Complete the single set
      const currentSet = this.getCurrentSet(score);
      if (currentSet) {
        currentSet.isCompleted = true;
        currentSet.team1Games = team1Games;
        currentSet.team2Games = team2Games;
      }
    } else {
      // Update match point status
      const team1OnMatchPoint = team1Games >= 9 && team1Games >= team2Games;
      const team2OnMatchPoint = team2Games >= 9 && team2Games >= team1Games;
      score.isMatchPoint = team1OnMatchPoint || team2OnMatchPoint;
    }

    return score;
  }

  /**
   * Win a game for the specified team
   */
  private static winGame(score: ITennisScore, gameWinner: 'team1' | 'team2', matchFormat: 'best-of-3' | 'best-of-5'): ITennisScore {
    // Reset points
    score.team1Points = 0;
    score.team2Points = 0;
    score.isDeuce = false;
    score.advantage = null;

    // Increment games
    if (gameWinner === 'team1') {
      score.team1Games++;
    } else {
      score.team2Games++;
    }

    // Check if set is won
    const team1Games = score.team1Games;
    const team2Games = score.team2Games;

    // Standard set win (6 games with 2-game lead)
    if ((team1Games >= this.GAMES_TO_WIN_SET && team1Games - team2Games >= 2) ||
        (team2Games >= this.GAMES_TO_WIN_SET && team2Games - team1Games >= 2)) {
      return this.winSet(score, gameWinner, matchFormat);
    }

    // Check for tiebreak situation (6-6)
    if (team1Games === this.GAMES_TO_WIN_SET && team2Games === this.GAMES_TO_WIN_SET) {
      return this.startTiebreak(score);
    }

    // Update game status indicators
    this.updateGameStatus(score, matchFormat);

    return score;
  }

  /**
   * Win a set for the specified team
   */
  private static winSet(score: ITennisScore, setWinner: 'team1' | 'team2', matchFormat: 'best-of-3' | 'best-of-5'): ITennisScore {
    // Complete current set
    const currentSet = this.getCurrentSet(score);
    if (currentSet) {
      currentSet.isCompleted = true;
    }

    // Increment sets won
    if (setWinner === 'team1') {
      score.team1Sets++;
    } else {
      score.team2Sets++;
    }

    // Check if match is won
    const setsToWin = matchFormat === 'best-of-5' ? this.SETS_TO_WIN_BEST_OF_5 : this.SETS_TO_WIN_BEST_OF_3;
    
    if ((setWinner === 'team1' && score.team1Sets >= setsToWin) ||
        (setWinner === 'team2' && score.team2Sets >= setsToWin)) {
      // Match won!
      score.winner = setWinner;
      score.isMatchPoint = false;
      score.isSetPoint = false;
    } else {
      // Start next set
      score.currentSet++;
      score.team1Games = 0;
      score.team2Games = 0;
      score.team1Points = 0;
      score.team2Points = 0;
      score.isDeuce = false;
      score.advantage = null;
      
      // Create new set
      const newSet: ISetScore = {
        setNumber: score.currentSet,
        team1Games: 0,
        team2Games: 0,
        isTiebreak: false,
        isCompleted: false
      };
      score.sets.push(newSet);
    }

    // Update status indicators
    this.updateGameStatus(score, matchFormat);

    return score;
  }

  /**
   * Start a tiebreak
   */
  private static startTiebreak(score: ITennisScore): ITennisScore {
    const currentSet = this.getCurrentSet(score);
    if (currentSet) {
      currentSet.isTiebreak = true;
      currentSet.team1Tiebreak = 0;
      currentSet.team2Tiebreak = 0;
    }

    // Reset game points for tiebreak
    score.team1Points = 0;
    score.team2Points = 0;
    score.isDeuce = false;
    score.advantage = null;

    return score;
  }

  /**
   * Get the current set being played
   */
  private static getCurrentSet(score: ITennisScore): ISetScore | null {
    if (score.sets.length === 0) {
      // Initialize first set
      const firstSet: ISetScore = {
        setNumber: 1,
        team1Games: score.team1Games,
        team2Games: score.team2Games,
        isTiebreak: false,
        isCompleted: false
      };
      score.sets.push(firstSet);
      return firstSet;
    }

    return score.sets[score.sets.length - 1];
  }

  /**
   * Update match point and set point indicators
   */
  private static updateGameStatus(score: ITennisScore, matchFormat: 'best-of-3' | 'best-of-5'): void {
    if (score.winner) {
      score.isMatchPoint = false;
      score.isSetPoint = false;
      return;
    }

    const setsToWin = matchFormat === 'best-of-5' ? this.SETS_TO_WIN_BEST_OF_5 : this.SETS_TO_WIN_BEST_OF_3;
    
    // Check for match point
    const team1OnMatchPoint = score.team1Sets === setsToWin - 1;
    const team2OnMatchPoint = score.team2Sets === setsToWin - 1;
    
    // Check for set point
    const team1OnSetPoint = score.team1Games >= 5 && score.team1Games >= score.team2Games;
    const team2OnSetPoint = score.team2Games >= 5 && score.team2Games >= score.team1Games;

    score.isMatchPoint = (team1OnMatchPoint && team1OnSetPoint) || (team2OnMatchPoint && team2OnSetPoint);
    score.isSetPoint = team1OnSetPoint || team2OnSetPoint;
  }

  /**
   * Initialize a new tennis score
   */
  static initializeScore(matchFormat: 'best-of-3' | 'best-of-5' = 'best-of-3', gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10' = 'regular'): ITennisScore {
    const firstSet: ISetScore = {
      setNumber: 1,
      team1Games: 0,
      team2Games: 0,
      isTiebreak: gameFormat === 'tiebreak-8' || gameFormat === 'tiebreak-10',
      isCompleted: false
    };

    return {
      team1Points: 0,
      team2Points: 0,
      team1Games: 0,
      team2Games: 0,
      team1Sets: 0,
      team2Sets: 0,
      currentSet: 1,
      sets: [firstSet],
      isDeuce: false,
      advantage: null,
      isMatchPoint: false,
      isSetPoint: false,
      winner: undefined
    };
  }

  /**
   * Validate if a tennis score is valid
   */
  static validateScore(score: ITennisScore, gameFormat: 'regular' | 'tiebreak-8' | 'tiebreak-10' = 'regular'): boolean {
    // Basic validation checks
    if (score.team1Points < 0 || score.team2Points < 0) return false;
    if (score.team1Games < 0 || score.team2Games < 0) return false;
    if (score.team1Sets < 0 || score.team2Sets < 0) return false;
    if (score.currentSet < 1) return false;
    
    // For tiebreak formats, points don't follow traditional tennis scoring
    if (gameFormat === 'tiebreak-8' || gameFormat === 'tiebreak-10') {
      // In tiebreak formats, points are usually 0 since scoring is based on games
      return true;
    }
    
    // Points should be valid tennis scores for regular format
    const validPoints = [0, 15, 30, 40];
    if (!validPoints.includes(score.team1Points) || !validPoints.includes(score.team2Points)) {
      // Allow for deuce/advantage situations
      if (!score.isDeuce && !score.advantage) return false;
    }

    return true;
  }
}