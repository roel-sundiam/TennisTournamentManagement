import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, authorize, optionalAuth } from '../middleware/auth';
import Team from '../models/Team';
import Tournament from '../models/Tournament';
import Player from '../models/Player';
import Bracket from '../models/Bracket';
import Match from '../models/Match';

const router = express.Router();

// @desc    Test bracket regeneration
// @route   POST /api/teams/test-regenerate/:tournamentId
// @access  Public
router.post('/test-regenerate/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId;
  
  console.log('🧪 TEST: Bracket regeneration for tournament:', tournamentId);
  
  try {
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, message: 'Tournament not found' });
      return;
    }
    
    // Check if bracket exists
    const existingBracket = await Bracket.findOne({ tournament: tournamentId });
    console.log('🧪 TEST: Existing bracket found:', !!existingBracket);
    
    if (existingBracket) {
      // Delete existing bracket
      await Bracket.deleteMany({ tournament: tournamentId });
      console.log('🧪 TEST: Deleted existing bracket');
    }
    
    // Get teams
    const teams = await Team.find({ tournament: tournamentId, isActive: true }).sort({ seed: 1 });
    console.log('🧪 TEST: Found teams:', teams.length);
    
    if (teams.length >= 2) {
      // Create new bracket
      const newBracket = await Bracket.create({
        tournament: tournamentId,
        name: `${tournament.name} Test Bracket - ${new Date().toISOString().slice(0, 19)}`,
        format: tournament.format,
        teams: teams.map(t => t._id),
        totalTeams: teams.length,
        totalRounds: Math.ceil(Math.log2(teams.length)),
        status: 'active',
        bracketData: { test: true, timestamp: new Date() }
      });
      
      console.log('🧪 TEST: Created new bracket:', newBracket._id);
      
      res.status(200).json({
        success: true,
        message: 'Test bracket regeneration completed',
        bracketId: newBracket._id
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Not enough teams for bracket generation'
      });
    }
  } catch (error: any) {
    console.error('🧪 TEST ERROR:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// @desc    Get all teams
// @route   GET /api/teams
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const teams = await Team.find({ isActive: true })
    .populate('players', 'firstName lastName skillLevel ranking')
    .populate('tournament', 'name gameType')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
}));

// @desc    Get teams for tournament
// @route   GET /api/teams/:tournamentId
// @access  Public
router.get('/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  const teams = await Team.find({ 
    tournament: req.params.tournamentId,
    isActive: true 
  })
    .populate('players', 'firstName lastName skillLevel ranking')
    .populate('tournament', 'name gameType')
    .sort({ seed: 1, createdAt: 1 });

  res.status(200).json({
    success: true,
    count: teams.length,
    data: teams
  });
}));

// @desc    Create teams for tournament
// @route   POST /api/teams/bulk
// @access  Private
router.post('/bulk', protect, authorize('admin', 'organizer', 'club-admin'), asyncHandler(async (req: Request, res: Response) => {
  console.log('🚨 TEAMS BULK ROUTE HIT!');
  console.log('🚨 Request body keys:', Object.keys(req.body));
  console.log('🚨 User:', req.user?.username);
  
  const { tournamentId, teams: teamsData } = req.body;

  if (!tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Tournament ID is required'
    });
    return;
  }

  if (!teamsData || !Array.isArray(teamsData) || teamsData.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Teams data is required and must be a non-empty array'
    });
    return;
  }

  // Verify tournament exists
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  try {
    console.log('📋 Creating teams for tournament:', tournamentId);
    console.log('📋 Teams data received:', JSON.stringify(teamsData, null, 2));

    // Validation disabled - proceeding with actual database save

    // Check if bracket exists for this tournament
    const existingBracket = await Bracket.findOne({ tournament: tournamentId });
    const hadBracket = !!existingBracket;
    
    console.log('🔍 Checking for existing bracket...');
    console.log('🔍 Tournament ID:', tournamentId);
    console.log('🔍 Existing bracket found:', hadBracket);
    if (existingBracket) {
      console.log('🔍 Existing bracket ID:', existingBracket._id);
      console.log('🔍 Existing bracket name:', existingBracket.name);
    }
    
    if (hadBracket) {
      console.log('🎯 Found existing bracket, will need to regenerate after team creation');
      
      // Delete existing matches first (they reference teams)
      await Match.deleteMany({ tournament: tournamentId });
      console.log('🗑️ Deleted existing matches');
      
      // Delete existing bracket
      await Bracket.deleteMany({ tournament: tournamentId });
      console.log('🗑️ Deleted existing bracket');
    } else {
      console.log('ℹ️ No existing bracket found, skipping regeneration');
    }

    // Clear existing teams for this tournament
    await Team.deleteMany({ tournament: tournamentId });

    const createdTeams = [];
    
    for (let i = 0; i < teamsData.length; i++) {
      const teamData = teamsData[i];
      
      console.log(`📋 Creating team ${i + 1}:`, {
        name: teamData.name,
        players: teamData.players.map((p: any) => p._id || p.id),
        tournament: tournamentId,
        seed: i + 1,
        averageSkillLevel: teamData.averageSkillLevel || 'intermediate'
      });

      try {
        // Create team
        console.log(`📋 About to create team ${i + 1} with data:`, {
          name: teamData.name,
          players: teamData.players.map((p: any) => p._id || p.id),
          tournament: tournamentId,
          seed: i + 1,
          averageSkillLevel: teamData.averageSkillLevel || 'intermediate'
        });

        const team = await Team.create({
          name: teamData.name,
          players: teamData.players.map((p: any) => p._id || p.id),
          tournament: tournamentId,
          club: tournament.club,
          seed: i + 1,
          averageSkillLevel: teamData.averageSkillLevel || 'intermediate'
        });

        console.log(`📋 Team ${i + 1} created successfully with ID:`, team._id);

        // Populate the created team
        const populatedTeam = await Team.findById(team._id)
          .populate('players', 'firstName lastName skillLevel ranking')
          .populate('tournament', 'name gameType');
        
        if (!populatedTeam) {
          throw new Error('Failed to find created team after population');
        }

        console.log(`📋 Team ${i + 1} populated successfully:`, {
          id: populatedTeam._id,
          name: populatedTeam.name,
          playersCount: populatedTeam.players.length
        });
        
        createdTeams.push(populatedTeam);
      } catch (teamError: any) {
        console.error(`❌ Error creating team ${i + 1}:`, teamError);
        throw new Error(`Failed to create team ${i + 1}: ${teamError.message}`);
      }
    }

    console.log(`📋 Final result: ${createdTeams.length} teams created`);

    // If there was a bracket before, regenerate it with the new teams
    if (hadBracket) {
      console.log('🔄 Regenerating bracket after team creation...');
      
      try {
        // Get the newly created teams for bracket generation
        const newTeams = await Team.find({ 
          tournament: tournamentId, 
          isActive: true 
        }).sort({ seed: 1 });

        console.log(`🔄 Found ${newTeams.length} teams for bracket regeneration`);

        if (newTeams.length < 2) {
          console.log('⚠️ Not enough teams for bracket generation');
          return;
        }

        // Create proper bracket structure with new teams
        const totalRounds = Math.ceil(Math.log2(newTeams.length));
        const rounds = [];
        
        // Generate first round matches
        const firstRoundMatches = [];
        for (let i = 0; i < newTeams.length; i += 2) {
          const team1 = newTeams[i];
          const team2 = newTeams[i + 1];
          
          if (team1 && team2) {
            firstRoundMatches.push({
              roundNumber: 1,
              matchNumber: Math.floor(i / 2) + 1,
              status: 'pending',
              player1: {
                id: (team1._id as any).toString(),
                name: team1.name,
                seed: team1.seed
              },
              player2: {
                id: (team2._id as any).toString(),
                name: team2.name,
                seed: team2.seed
              }
            });
          }
        }
        
        // Add first round
        rounds.push({
          roundNumber: 1,
          roundName: totalRounds === 1 ? 'Final' : totalRounds === 2 ? 'Semifinal' : `Round 1`,
          matches: firstRoundMatches,
          isCompleted: false
        });
        
        // Generate subsequent rounds (empty for now)
        for (let round = 2; round <= totalRounds; round++) {
          const matchesInRound = Math.ceil(firstRoundMatches.length / Math.pow(2, round - 1));
          const roundMatches = [];
          
          for (let i = 0; i < matchesInRound; i++) {
            roundMatches.push({
              roundNumber: round,
              matchNumber: i + 1,
              status: 'pending'
            });
          }
          
          const roundName = totalRounds - round + 1 === 1 ? 'Final' : 
                          totalRounds - round + 1 === 2 ? 'Semifinal' : 
                          totalRounds - round + 1 === 3 ? 'Quarterfinal' : 
                          `Round ${round}`;
          
          rounds.push({
            roundNumber: round,
            roundName: roundName,
            matches: roundMatches,
            isCompleted: false
          });
        }

        // Create the bracket data structure
        const bracketData = {
          tournamentId: tournamentId,
          format: tournament.format,
          status: 'draft',
          rounds: rounds,
          totalRounds: totalRounds,
          createdAt: new Date().toISOString()
        };

        console.log('🔄 Creating bracket with data:', {
          tournamentId,
          name: `${tournament.name} Bracket`,
          format: tournament.format,
          totalTeams: newTeams.length,
          totalRounds: totalRounds,
          roundsGenerated: rounds.length
        });

        // Create new bracket directly using the Bracket model
        const newBracket = await Bracket.create({
          tournament: tournamentId,
          name: `${tournament.name} Bracket - ${new Date().toISOString().slice(0, 19)}`,
          format: tournament.format,
          teams: newTeams.map(t => t._id),
          totalTeams: newTeams.length,
          totalRounds: totalRounds,
          status: 'active',
          bracketData: bracketData,
          regeneratedAt: new Date()
        });

        console.log('✅ Bracket regenerated successfully with ID:', newBracket._id);
        console.log('🎯 New bracket teams:', newBracket.teams);
        console.log('🎯 New bracket format:', newBracket.format);
        console.log('🎯 New bracket status:', newBracket.status);
      } catch (bracketError: any) {
        console.error('❌ Error regenerating bracket:', bracketError);
        console.error('❌ Bracket error details:', bracketError.message);
        console.error('❌ Bracket error stack:', bracketError.stack);
      }
    }

    console.log(`📋 Returning success response`);

    res.status(201).json({
      success: true,
      count: createdTeams.length,
      data: createdTeams,
      message: `${createdTeams.length} teams created successfully`
    });

  } catch (error: any) {
    console.error('❌ Error creating teams:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create teams',
      error: error.name,
      details: error.stack
    });
  }
}));

// @desc    Create single team
// @route   POST /api/teams
// @access  Private
router.post('/', protect, authorize('admin', 'organizer', 'club-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { name, players, tournamentId, seed } = req.body;

  if (!name || !players || !tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Name, players, and tournament ID are required'
    });
    return;
  }

  try {
    // Get tournament to access club information
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
      return;
    }

    const team = await Team.create({
      name,
      players,
      tournament: tournamentId,
      club: tournament.club,
      seed,
      averageSkillLevel: 'intermediate'
    });

    const populatedTeam = await Team.findById(team._id)
      .populate('players', 'firstName lastName skillLevel ranking')
      .populate('tournament', 'name gameType');

    res.status(201).json({
      success: true,
      data: populatedTeam
    });

  } catch (error: any) {
    console.error('Error creating team:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create team'
    });
  }
}));

// @desc    Update team
// @route   PUT /api/teams/:id
// @access  Private
router.put('/:id', protect, authorize('admin', 'organizer', 'club-admin'), asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('players', 'firstName lastName skillLevel ranking')
    .populate('tournament', 'name gameType');

  if (!team) {
    res.status(404).json({
      success: false,
      message: 'Team not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: team
  });
}));

// @desc    Delete teams by tournament
// @route   DELETE /api/teams/tournament/:tournamentId
// @access  Private
router.delete('/tournament/:tournamentId', protect, authorize('admin', 'organizer', 'club-admin'), asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId } = req.params;

  if (!tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Tournament ID is required'
    });
    return;
  }

  try {
    const result = await Team.deleteMany({ tournament: tournamentId });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} teams deleted successfully`
    });
  } catch (error: any) {
    console.error('Error deleting teams by tournament:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete teams'
    });
  }
}));

// @desc    Delete team
// @route   DELETE /api/teams/:id
// @access  Private
router.delete('/:id', protect, authorize('admin', 'organizer', 'club-admin'), asyncHandler(async (req: Request, res: Response) => {
  const team = await Team.findById(req.params.id);

  if (!team) {
    res.status(404).json({
      success: false,
      message: 'Team not found'
    });
    return;
  }

  await team.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Team deleted successfully'
  });
}));

export default router;