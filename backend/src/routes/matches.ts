import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import Match from '../models/Match';
import { TennisScoringService } from '../services/tennisScoring';
import Bracket from '../models/Bracket';

const router = express.Router();

// Helper function to advance winner to next round in bracket
async function advanceWinnerToNextRound(completedMatch: any, winnerTeam: any): Promise<void> {
  try {
    console.log('🏆 Advancing winner to next round:', {
      matchId: completedMatch._id,
      winner: winnerTeam,
      round: completedMatch.round,
      matchNumber: completedMatch.matchNumber
    });

    // Get the bracket for this tournament
    const bracket = await Bracket.findOne({ tournament: completedMatch.tournament });
    if (!bracket) {
      console.log('⚠️ No bracket found for tournament');
      return;
    }

    // Find the next round match that this winner should advance to
    const nextRound = completedMatch.round + 1;
    const nextMatchNumber = Math.ceil(completedMatch.matchNumber / 2);

    console.log('🔍 Looking for next match:', {
      nextRound,
      nextMatchNumber,
      currentRound: completedMatch.round,
      currentMatch: completedMatch.matchNumber
    });

    // Find the next match in the database
    const nextMatch = await Match.findOne({
      tournament: completedMatch.tournament,
      bracket: completedMatch.bracket,
      round: nextRound,
      matchNumber: nextMatchNumber
    });

    if (!nextMatch) {
      console.log('🏁 No next match found - tournament may be complete or this is the final');
      return;
    }

    // Determine if winner goes to team1 or team2 slot in next match
    // Standard tournament bracket logic: odd matches go to team1, even matches go to team2
    // But for Round 1 → Round 2, we need special logic to ensure proper seeding
    let isTeam1Slot;
    
    if (completedMatch.round === 1) {
      // Round 1 to Round 2 (Quarterfinals to Semifinals)
      // Match 1 & 4 winners should meet in one semifinal
      // Match 2 & 3 winners should meet in the other semifinal
      if (nextMatchNumber === 1) {
        // Semifinal 1: Match 1 winner vs Match 4 winner
        isTeam1Slot = (completedMatch.matchNumber === 1);
      } else {
        // Semifinal 2: Match 2 winner vs Match 3 winner  
        isTeam1Slot = (completedMatch.matchNumber === 2);
      }
    } else {
      // For other rounds, use standard logic
      isTeam1Slot = completedMatch.matchNumber % 2 === 1;
    }
    
    console.log('⚡ Advancing winner:', {
      nextMatchId: nextMatch._id,
      slot: isTeam1Slot ? 'team1' : 'team2',
      winnerTeam: winnerTeam
    });

    if (isTeam1Slot) {
      nextMatch.team1 = winnerTeam;
    } else {
      nextMatch.team2 = winnerTeam;
    }

    // If both teams are now set, the match is ready to be played
    if (nextMatch.team1 && nextMatch.team2) {
      nextMatch.status = 'scheduled';
      console.log('✅ Next match is now ready for play:', {
        team1: nextMatch.team1,
        team2: nextMatch.team2
      });
    }

    await nextMatch.save();
    
    // Populate the teams in the next match for proper display
    await nextMatch.populate('team1', 'name players seed ranking averageSkillLevel');
    await nextMatch.populate('team2', 'name players seed ranking averageSkillLevel');
    
    console.log('💾 Next match updated successfully');

    // Also update the bracket data structure if it exists
    if (bracket.bracketData && bracket.bracketData.rounds) {
      for (const round of bracket.bracketData.rounds) {
        if (round.roundNumber === nextRound) {
          for (const match of round.matches) {
            if (match.matchNumber === nextMatchNumber) {
              if (isTeam1Slot) {
                match.player1 = {
                  id: winnerTeam._id || winnerTeam,
                  name: winnerTeam.name || 'Advanced Team',
                  seed: winnerTeam.seed,
                  ranking: winnerTeam.ranking
                };
              } else {
                match.player2 = {
                  id: winnerTeam._id || winnerTeam,
                  name: winnerTeam.name || 'Advanced Team',
                  seed: winnerTeam.seed,
                  ranking: winnerTeam.ranking
                };
              }
              
              // Update match status if both players are set
              if (match.player1 && match.player2) {
                match.status = 'pending';
              }
              
              console.log('📊 Updated bracket data structure for next match');
              break;
            }
          }
          break;
        }
      }
      
      await bracket.save();
      console.log('💾 Bracket data updated successfully');
    }

  } catch (error) {
    console.error('❌ Error advancing winner to next round:', error);
    // Don't throw - we don't want to fail the entire match completion
  }
}

// @desc    Get all live matches across tournaments
// @route   GET /api/matches/live
// @access  Public
router.get('/live', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const liveMatches = await Match.find({ status: 'in-progress' })
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate('tournament', 'name')
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: liveMatches.length,
    data: liveMatches
  });
}));

// @desc    Get all completed matches across tournaments
// @route   GET /api/matches/completed
// @access  Public
router.get('/completed', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId, limit = 50, page = 1 } = req.query;
  
  const query: any = { status: 'completed' };
  if (tournamentId) {
    query.tournament = tournamentId;
  }

  const skip = (Number(page) - 1) * Number(limit);
  
  const completedMatches = await Match.find(query)
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate('tournament', 'name')
    .populate({
      path: 'winner',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .sort({ 'score.endTime': -1, updatedAt: -1 })
    .limit(Number(limit))
    .skip(skip);

  const totalCount = await Match.countDocuments(query);

  res.status(200).json({
    success: true,
    count: completedMatches.length,
    totalCount,
    currentPage: Number(page),
    totalPages: Math.ceil(totalCount / Number(limit)),
    data: completedMatches
  });
}));

// @desc    Create multiple matches in bulk
// @route   POST /api/matches/bulk
// @access  Private
router.post('/bulk', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { matches } = req.body;

  if (!matches || !Array.isArray(matches) || matches.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Array of matches is required'
    });
    return;
  }

  console.log(`🔧 Bulk creating ${matches.length} matches`);

  const createdMatches = [];
  const errors = [];

  for (let i = 0; i < matches.length; i++) {
    const matchData = matches[i];
    
    try {
      console.log(`🔍 Processing match ${i + 1}:`, matchData);
      
      // Validate required fields (allow null teams for future rounds)
      if (!matchData.tournamentId || !matchData.bracketId) {
        const error = `Missing required fields: tournamentId(${!!matchData.tournamentId}), bracketId(${!!matchData.bracketId})`;
        console.error(`❌ Match ${i + 1} validation failed:`, error);
        errors.push({
          index: i,
          error
        });
        continue;
      }

      // Get tournament to inherit game format
      const Tournament = (await import('../models/Tournament')).default;
      const tournament = await Tournament.findById(matchData.tournamentId);
      
      if (!tournament) {
        errors.push({
          index: i,
          error: 'Tournament not found'
        });
        continue;
      }

      const gameFormat = tournament.gameFormat || 'regular';

      // Create the match
      const match = await Match.create({
        tournament: matchData.tournamentId,
        round: matchData.round || 1,
        matchNumber: matchData.matchNumber || 1,
        team1: matchData.team1 || null,
        team2: matchData.team2 || null,
        bracket: matchData.bracketId,
        bracketPosition: matchData.bracketPosition || {
          round: matchData.round || 1,
          position: matchData.matchNumber || 1
        },
        status: matchData.status || 'pending', // Default to pending for incomplete matches
        matchFormat: 'best-of-3',
        gameFormat: gameFormat,
        score: {
          tennisScore: TennisScoringService.initializeScore('best-of-3', gameFormat),
          isCompleted: false,
          startTime: null,
          endTime: null,
          duration: 0
        }
      });

      // Only populate teams if they exist
      if (match.team1) {
        await match.populate({
          path: 'team1',
          select: 'name players seed',
          populate: {
            path: 'players',
            select: 'firstName lastName ranking'
          }
        });
      }
      if (match.team2) {
        await match.populate({
          path: 'team2',
          select: 'name players seed',
          populate: {
            path: 'players',
            select: 'firstName lastName ranking'
          }
        });
      }
      
      createdMatches.push(match);
      console.log(`✅ Created match ${i + 1}/${matches.length}: Round ${match.round}, Match ${match.matchNumber}`);
      
    } catch (error: any) {
      console.error(`❌ Error creating match ${i + 1}:`, error.message);
      errors.push({
        index: i,
        error: error.message
      });
    }
  }

  console.log(`📊 Bulk creation complete: ${createdMatches.length} created, ${errors.length} errors`);

  res.status(201).json({
    success: true,
    message: `Created ${createdMatches.length} matches (${errors.length} errors)`,
    data: createdMatches,
    errors: errors.length > 0 ? errors : undefined
  });
}));

// @desc    Create missing matches for existing tournament
// @route   POST /api/matches/create-missing/:tournamentId
// @access  Private
router.post('/create-missing/:tournamentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId } = req.params;
  
  console.log(`🔧 Creating missing matches for tournament: ${tournamentId}`);
  
  // Get the bracket for this tournament
  const bracket = await Bracket.findOne({ tournament: tournamentId });
  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found for tournament'
    });
    return;
  }
  
  // Get existing matches
  const existingMatches = await Match.find({ tournament: tournamentId });
  const existingMatchKeys = new Set(existingMatches.map(m => `${m.round}-${m.matchNumber}`));
  
  console.log('📊 Existing matches:', existingMatchKeys);
  
  // Get tournament for game format
  const Tournament = (await import('../models/Tournament')).default;
  const tournament = await Tournament.findById(tournamentId);
  const gameFormat = tournament?.gameFormat || 'regular';
  
  const createdMatches = [];
  
  // Create matches from bracket structure
  if (bracket.bracketData && bracket.bracketData.rounds) {
    for (const round of bracket.bracketData.rounds) {
      for (const match of round.matches) {
        const matchKey = `${match.roundNumber}-${match.matchNumber}`;
        
        // Skip if match already exists
        if (existingMatchKeys.has(matchKey)) {
          console.log(`⏭️ Skipping existing match: Round ${match.roundNumber}, Match ${match.matchNumber}`);
          continue;
        }
        
        console.log(`➕ Creating missing match: Round ${match.roundNumber}, Match ${match.matchNumber}`);
        
        const team1Id = match.player1?.id || null;
        const team2Id = match.player2?.id || null;
        
        const newMatch = await Match.create({
          tournament: tournamentId,
          round: match.roundNumber,
          matchNumber: match.matchNumber,
          team1: team1Id,
          team2: team2Id,
          bracket: bracket._id,
          bracketPosition: {
            round: match.roundNumber,
            position: match.matchNumber
          },
          status: (team1Id && team2Id) ? 'scheduled' : 'pending',
          matchFormat: 'best-of-3',
          gameFormat: gameFormat,
          score: {
            tennisScore: TennisScoringService.initializeScore('best-of-3', gameFormat),
            isCompleted: false,
            startTime: null,
            endTime: null,
            duration: 0
          }
        });
        
        // Populate teams if they exist
        if (newMatch.team1) {
          await newMatch.populate({
            path: 'team1',
            select: 'name players seed',
            populate: {
              path: 'players',
              select: 'firstName lastName ranking'
            }
          });
        }
        if (newMatch.team2) {
          await newMatch.populate({
            path: 'team2',
            select: 'name players seed',
            populate: {
              path: 'players',
              select: 'firstName lastName ranking'
            }
          });
        }
        
        createdMatches.push(newMatch);
        console.log(`✅ Created match: Round ${newMatch.round}, Match ${newMatch.matchNumber}`);
      }
    }
  }
  
  console.log(`📊 Created ${createdMatches.length} missing matches`);
  
  res.status(201).json({
    success: true,
    message: `Created ${createdMatches.length} missing matches`,
    data: createdMatches
  });
}));

// @desc    Get matches for tournament
// @route   GET /api/matches/:tournamentId
// @access  Public
router.get('/:tournamentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId } = req.params;
  const { status } = req.query;

  const query: any = { tournament: tournamentId };
  if (status) {
    query.status = status;
  }

  const matches = await Match.find(query)
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate('tournament', 'name')
    .sort({ round: 1, matchNumber: 1 });

  res.status(200).json({
    success: true,
    count: matches.length,
    data: matches
  });
}));

// @desc    Get single match
// @route   GET /api/matches/match/:id
// @access  Public
router.get('/match/:id', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const match = await Match.findById(req.params.id)
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate('tournament', 'name gameFormat');

  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: match
  });
}));

// @desc    Start match
// @route   PUT /api/matches/:id/start
// @access  Private
router.put('/:id/start', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const match = await Match.findById(req.params.id);

  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }

  if (match.status !== 'scheduled') {
    res.status(400).json({
      success: false,
      message: 'Match can only be started if it is scheduled'
    });
    return;
  }

  match.status = 'in-progress';
  match.score.startTime = new Date();
  
  // Initialize tennis score if not already done
  if (!match.score.tennisScore.sets || match.score.tennisScore.sets.length === 0) {
    match.score.tennisScore = TennisScoringService.initializeScore(match.matchFormat, match.gameFormat || 'regular');
  }
  
  await match.save();

  res.status(200).json({
    success: true,
    data: match
  });
}));

// @desc    Update match score (award point)
// @route   PUT /api/matches/:id/score
// @access  Private
router.put('/:id/score', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { pointWinner } = req.body; // 'team1' or 'team2'

  if (!pointWinner || !['team1', 'team2'].includes(pointWinner)) {
    res.status(400).json({
      success: false,
      message: 'Point winner must be either "team1" or "team2"'
    });
    return;
  }

  const match = await Match.findById(req.params.id)
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    });

  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }

  if (match.status !== 'in-progress') {
    res.status(400).json({
      success: false,
      message: 'Match must be in progress to update score'
    });
    return;
  }

  if (match.score.isCompleted) {
    res.status(400).json({
      success: false,
      message: 'Match is already completed'
    });
    return;
  }

  // Apply comprehensive tennis scoring logic
  console.log('🎾 Score before awarding point:', JSON.stringify(match.score.tennisScore, null, 2));
  
  // CRITICAL: Convert Mongoose subdocument to plain object to avoid reference issues
  const plainScore = JSON.parse(JSON.stringify(match.score.tennisScore));
  console.log('🔄 Plain score object:', JSON.stringify(plainScore, null, 2));
  
  const updatedScore = TennisScoringService.awardPoint(
    plainScore,
    pointWinner as 'team1' | 'team2',
    match.matchFormat,
    match.gameFormat || 'regular'
  );
  console.log('🎾 Score after awarding point:', JSON.stringify(updatedScore, null, 2));
  
  // Assign the updated score back to the match
  match.score.tennisScore = updatedScore;
  
  // CRITICAL: Mark nested objects as modified for Mongoose to detect the change
  match.markModified('score.tennisScore');

  // Update current games in the main score object for consistency
  match.score.tennisScore.sets.forEach((set, index) => {
    if (index === match.score.tennisScore.currentSet - 1) {
      set.team1Games = match.score.tennisScore.team1Games;
      set.team2Games = match.score.tennisScore.team2Games;
    }
  });

  // Check if match is completed
  if (match.score.tennisScore.winner) {
    match.status = 'completed';
    match.score.isCompleted = true;
    match.score.endTime = new Date();
    
    if (match.score.startTime) {
      match.score.duration = Math.round(
        (match.score.endTime.getTime() - match.score.startTime.getTime()) / (1000 * 60)
      );
    }

    // Determine the winner team and advance to next round
    const winnerTeam = match.score.tennisScore.winner === 'team1' ? match.team1 : match.team2;
    match.winner = winnerTeam;
    
    // Populate the winner team with full data before advancement
    await match.populate('winner', 'name players seed ranking averageSkillLevel');
    
    // Advance winner to next round in bracket
    await advanceWinnerToNextRound(match, match.winner);
  }

  console.log('💾 About to save match with score:', JSON.stringify(match.score.tennisScore, null, 2));
  await match.save();
  console.log('✅ Match saved successfully');

  res.status(200).json({
    success: true,
    data: match
  });
}));

// @desc    Set final score directly (for tiebreak formats)
// @route   PUT /api/matches/:id/final-score
// @access  Private
router.put('/:id/final-score', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { gameFormat, finalScore, status } = req.body;

  const match = await Match.findById(req.params.id)
    .populate({
      path: 'team1',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    })
    .populate({
      path: 'team2',
      select: 'name players seed',
      populate: {
        path: 'players',
        select: 'firstName lastName ranking'
      }
    });

  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }

  // Update game format if provided
  if (gameFormat) {
    match.gameFormat = gameFormat;
  }

  // Set final score directly for all game formats
  if (finalScore) {
    match.score.tennisScore = {
      team1Points: 0,
      team2Points: 0,
      team1Games: finalScore.team1Games,
      team2Games: finalScore.team2Games,
      team1Sets: finalScore.winner === 'team1' ? 1 : 0,
      team2Sets: finalScore.winner === 'team2' ? 1 : 0,
      currentSet: 1,
      sets: [{
        setNumber: 1,
        team1Games: finalScore.team1Games,
        team2Games: finalScore.team2Games,
        isTiebreak: gameFormat === 'tiebreak-8' || gameFormat === 'tiebreak-10',
        isCompleted: true
      }],
      isDeuce: false,
      advantage: null,
      isMatchPoint: false,
      isSetPoint: false,
      winner: finalScore.winner
    };

    // Set match winner
    if (finalScore.winner === 'team1') {
      match.winner = match.team1;
      match.score.winner = match.team1;
    } else {
      match.winner = match.team2;
      match.score.winner = match.team2;
    }
  }

  // Update status
  if (status) {
    match.status = status;
    if (status === 'completed') {
      match.score.isCompleted = true;
      if (!match.score.endTime) {
        match.score.endTime = new Date();
        if (match.score.startTime) {
          match.score.duration = Math.round(
            (match.score.endTime.getTime() - match.score.startTime.getTime()) / (1000 * 60)
          );
        }
      }

      // Advance winner to next round if match is completed
      if (match.winner) {
        // Populate the winner team with full data before advancement
        await match.populate('winner', 'name players seed ranking averageSkillLevel');
        await advanceWinnerToNextRound(match, match.winner);
      }
    }
  }

  // Mark the nested score object as modified
  match.markModified('score.tennisScore');
  
  await match.save();

  res.status(200).json({
    success: true,
    data: match
  });
}));

// @desc    Complete match
// @route   PUT /api/matches/:id/complete
// @access  Private
router.put('/:id/complete', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const match = await Match.findById(req.params.id);

  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }

  if (match.status === 'completed') {
    res.status(400).json({
      success: false,
      message: 'Match is already completed'
    });
    return;
  }

  match.status = 'completed';
  match.score.isCompleted = true;
  
  await match.save();

  res.status(200).json({
    success: true,
    data: match
  });
}));

// @desc    Create new match
// @route   POST /api/matches
// @access  Private
router.post('/', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId, round, team1, team2, bracketId, matchNumber } = req.body;

  if (!tournamentId || !team1 || !team2 || !bracketId) {
    res.status(400).json({
      success: false,
      message: 'Tournament ID, team1, team2, and bracketId are required'
    });
    return;
  }

  // Get tournament to inherit game format
  const Tournament = (await import('../models/Tournament')).default;
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  const gameFormat = tournament.gameFormat || 'regular';

  const match = await Match.create({
    tournament: tournamentId,
    round: round || 1,
    matchNumber: matchNumber || 1,
    team1,
    team2,
    bracket: bracketId,
    bracketPosition: {
      round: round || 1,
      position: matchNumber || 1
    },
    status: 'scheduled',
    matchFormat: 'best-of-3',
    gameFormat: gameFormat,
    score: {
      tennisScore: TennisScoringService.initializeScore('best-of-3', gameFormat),
      isCompleted: false,
      startTime: null,
      endTime: null,
      duration: 0
    }
  });

  await match.populate({
    path: 'team1',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await match.populate({
    path: 'team2',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await match.populate('tournament', 'name');

  res.status(201).json({
    success: true,
    data: match
  });
}));

// @desc    Fix tournament semifinals (temporary endpoint)
// @route   POST /api/matches/fix-semifinals/:tournamentId
// @access  Private
router.post('/fix-semifinals/:tournamentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId } = req.params;
  
  console.log(`🔧 Fixing semifinals for tournament: ${tournamentId}`);
  
  // Get Round 1 completed matches to find winners
  const round1Matches = await Match.find({ 
    tournament: tournamentId, 
    round: 1,
    status: 'completed'
  }).populate('winner', 'name players');
  
  if (round1Matches.length !== 4) {
    res.status(400).json({
      success: false,
      message: `Expected 4 completed Round 1 matches, found ${round1Matches.length}`
    });
    return;
  }
  
  // Sort matches by match number
  round1Matches.sort((a, b) => a.matchNumber - b.matchNumber);
  
  // Extract winners
  const match1Winner = round1Matches[0].winner;
  const match2Winner = round1Matches[1].winner;
  const match3Winner = round1Matches[2].winner;
  const match4Winner = round1Matches[3].winner;
  
  // Verify all matches have winners
  if (!match1Winner || !match2Winner || !match3Winner || !match4Winner) {
    res.status(400).json({
      success: false,
      message: 'All Round 1 matches must have winners'
    });
    return;
  }
  
  // Find Round 2 matches
  const round2Matches = await Match.find({ 
    tournament: tournamentId, 
    round: 2 
  }).sort({ matchNumber: 1 });
  
  if (round2Matches.length !== 2) {
    res.status(400).json({
      success: false,
      message: `Expected 2 Round 2 matches, found ${round2Matches.length}`
    });
    return;
  }
  
  // Fix Semifinal 1: Match 1 winner vs Match 4 winner
  round2Matches[0].team1 = match1Winner;
  round2Matches[0].team2 = match4Winner;
  round2Matches[0].status = 'scheduled';
  await round2Matches[0].save();
  
  // Fix Semifinal 2: Match 2 winner vs Match 3 winner
  round2Matches[1].team1 = match2Winner;
  round2Matches[1].team2 = match3Winner;
  round2Matches[1].status = 'scheduled';
  await round2Matches[1].save();
  
  // Populate the updated matches
  await round2Matches[0].populate({
    path: 'team1',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await round2Matches[0].populate({
    path: 'team2',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await round2Matches[1].populate({
    path: 'team1',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await round2Matches[1].populate({
    path: 'team2',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  
  console.log('✅ Fixed semifinals successfully');
  
  res.status(200).json({
    success: true,
    message: 'Semifinals fixed successfully',
    data: round2Matches
  });
}));

// @desc    Create matches from bracket
// @route   POST /api/matches/from-bracket
// @access  Private
router.post('/from-bracket', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { bracketId, tournamentId } = req.body;

  if (!bracketId || !tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Bracket ID and tournament ID are required'
    });
    return;
  }

  // Get tournament to inherit game format
  const Tournament = (await import('../models/Tournament')).default;
  const tournament = await Tournament.findById(tournamentId);
  
  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  const gameFormat = tournament.gameFormat || 'regular';

  // Get bracket from database
  const bracket = await req.app.get('db').collection('brackets').findOne({ _id: bracketId });
  
  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found'
    });
    return;
  }

  const createdMatches = [];

  // Generate matches from bracket structure
  if (bracket.bracketData?.rounds) {
    for (const round of bracket.bracketData.rounds) {
      for (const match of round.matches) {
        if (match.player1 && match.player2) {
          const newMatch = await Match.create({
            tournament: tournamentId,
            round: round.roundNumber,
            matchNumber: match.matchNumber,
            team1: match.player1.id,
            team2: match.player2.id,
            bracket: bracketId,
            bracketPosition: `R${round.roundNumber}M${match.matchNumber}`,
            status: 'scheduled',
            matchFormat: 'best-of-3',
            gameFormat: gameFormat,
            score: {
              tennisScore: TennisScoringService.initializeScore('best-of-3', gameFormat),
              isCompleted: false,
              startTime: null,
              endTime: null,
              duration: 0
            }
          });

          await newMatch.populate({
            path: 'team1',
            select: 'name players seed',
            populate: {
              path: 'players',
              select: 'firstName lastName ranking'
            }
          });
          await newMatch.populate({
            path: 'team2',
            select: 'name players seed',
            populate: {
              path: 'players',
              select: 'firstName lastName ranking'
            }
          });
          
          createdMatches.push(newMatch);
        }
      }
    }
  }

  res.status(201).json({
    success: true,
    message: `Created ${createdMatches.length} matches from bracket`,
    data: createdMatches
  });
}));

// @desc    Fix tournament final (assign semifinal winners to final)
// @route   POST /api/matches/fix-final/:tournamentId
// @access  Private
router.post('/fix-final/:tournamentId', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { tournamentId } = req.params;
  
  console.log(`🔧 Fixing final for tournament: ${tournamentId}`);
  
  // Get Round 2 completed matches (semifinals) to find winners
  const round2Matches = await Match.find({ 
    tournament: tournamentId, 
    round: 2,
    status: 'completed'
  }).populate('winner', 'name players');
  
  if (round2Matches.length !== 2) {
    res.status(400).json({
      success: false,
      message: `Expected 2 completed Round 2 matches, found ${round2Matches.length}`
    });
    return;
  }
  
  // Sort matches by match number
  round2Matches.sort((a, b) => a.matchNumber - b.matchNumber);
  
  // Extract winners
  const semifinal1Winner = round2Matches[0].winner;
  const semifinal2Winner = round2Matches[1].winner;
  
  // Verify both semifinals have winners
  if (!semifinal1Winner || !semifinal2Winner) {
    res.status(400).json({
      success: false,
      message: 'Both semifinals must be completed with winners'
    });
    return;
  }
  
  // Find the final match (Round 3)
  const finalMatch = await Match.findOne({ 
    tournament: tournamentId, 
    round: 3,
    matchNumber: 1
  });
  
  if (!finalMatch) {
    res.status(404).json({
      success: false,
      message: 'Final match not found'
    });
    return;
  }
  
  // Assign semifinal winners to final
  finalMatch.team1 = semifinal1Winner;
  finalMatch.team2 = semifinal2Winner;
  finalMatch.status = 'scheduled';
  await finalMatch.save();
  
  // Populate the updated final match
  await finalMatch.populate({
    path: 'team1',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  await finalMatch.populate({
    path: 'team2',
    select: 'name players seed',
    populate: {
      path: 'players',
      select: 'firstName lastName ranking'
    }
  });
  
  console.log('✅ Fixed final match successfully');
  
  res.status(200).json({
    success: true,
    message: 'Final match teams assigned successfully',
    data: finalMatch
  });
}));

export default router;