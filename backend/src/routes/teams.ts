import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import Team from '../models/Team';
import Tournament from '../models/Tournament';
import Player from '../models/Player';

const router = express.Router();

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
router.post('/bulk', asyncHandler(async (req: Request, res: Response) => {
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
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { name, players, tournamentId, seed } = req.body;

  if (!name || !players || !tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Name, players, and tournament ID are required'
    });
    return;
  }

  try {
    const team = await Team.create({
      name,
      players,
      tournament: tournamentId,
      seed
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
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
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
router.delete('/tournament/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
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
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
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