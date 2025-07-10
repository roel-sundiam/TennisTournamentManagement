import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import Player from '../models/Player';

const router = express.Router();

// @desc    Get all players (global)
// @route   GET /api/players
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const players = await Player.find({ isActive: true })
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: players.length,
    data: players
  });
}));

// @desc    Get players for tournament
// @route   GET /api/players/tournament/:tournamentId
// @access  Public
router.get('/tournament/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  // Import PlayerRegistration model
  const PlayerRegistration = require('../models/PlayerRegistration').default;
  
  // Get player registrations for this tournament and populate player data
  const registrations = await PlayerRegistration.find({ 
    tournament: req.params.tournamentId,
    isActive: true 
  })
  .populate('player', 'firstName lastName email phone skillLevel ranking isActive')
  .sort({ seed: 1, registrationDate: 1 });

  // Transform the data to match the expected format
  const players = registrations.map((reg: any) => ({
    ...reg.player.toObject(),
    seed: reg.seed,
    seedPosition: reg.seed,
    registrationId: reg._id,
    fullName: `${reg.player.firstName} ${reg.player.lastName}`
  }));

  res.status(200).json({
    success: true,
    count: players.length,
    data: players
  });
}));

// @desc    Get player by ID
// @route   GET /api/players/:id
// @access  Public
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const player = await Player.findById(req.params.id)
    .populate('tournament', 'name');

  if (!player) {
    res.status(404).json({
      success: false,
      message: 'Player not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: player
  });
}));

// @desc    Add player to tournament
// @route   POST /api/players
// @access  Private
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // Debug: Log the received data
  console.log('Received player data:', JSON.stringify(req.body, null, 2));
  
  // Validate required fields
  if (!req.body.name || !req.body.name.trim()) {
    res.status(400).json({
      success: false,
      message: 'Player name is required'
    });
    return;
  }
  
  if (!req.body.skillLevel) {
    res.status(400).json({
      success: false,
      message: 'Skill level is required'
    });
    return;
  }
  
  
  // Split name into firstName and lastName
  const fullName = req.body.name.trim();
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || firstName; // Use firstName as lastName if no last name provided

  const playerData = {
    firstName,
    lastName,
    email: req.body.email,
    phone: req.body.phone,
    dateOfBirth: req.body.dateOfBirth,
    skillLevel: req.body.skillLevel,
    ranking: req.body.ranking
  };

  try {
    const player = await Player.create(playerData);
    
    res.status(201).json({
      success: true,
      data: player
    });
  } catch (error: any) {
    console.error('Error creating player:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      res.status(400).json({
        success: false,
        message: 'Validation Error',
        errors: messages
      });
    } else if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: 'Player with this email already exists in this tournament'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to create player'
      });
    }
  }
}));

// @desc    Update player
// @route   PUT /api/players/:id
// @access  Private
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  // Handle name splitting if provided
  let updateData = { ...req.body };
  if (req.body.name) {
    const nameParts = req.body.name.trim().split(' ');
    updateData.firstName = nameParts[0] || '';
    updateData.lastName = nameParts.slice(1).join(' ') || '';
    delete updateData.name;
  }

  const player = await Player.findByIdAndUpdate(
    req.params.id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  ).populate('tournament', 'name');

  if (!player) {
    res.status(404).json({
      success: false,
      message: 'Player not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: player
  });
}));

// @desc    Delete player
// @route   DELETE /api/players/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const player = await Player.findById(req.params.id);

  if (!player) {
    res.status(404).json({
      success: false,
      message: 'Player not found'
    });
    return;
  }

  await player.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Player deleted successfully'
  });
}));

// @desc    Register players for a tournament
// @route   POST /api/players/register-tournament
// @access  Public
router.post('/register-tournament', asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, playerIds } = req.body;

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Player IDs array is required'
    });
    return;
  }

  if (!tournamentId) {
    res.status(400).json({
      success: false,
      message: 'Tournament ID is required'
    });
    return;
  }

  try {
    // Import PlayerRegistration model
    const PlayerRegistration = require('../models/PlayerRegistration').default;
    const Tournament = require('../models/Tournament').default;

    // Verify tournament exists
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
      return;
    }

    // Verify all players exist
    const players = await Player.find({ _id: { $in: playerIds }, isActive: true });
    if (players.length !== playerIds.length) {
      res.status(400).json({
        success: false,
        message: 'One or more players not found'
      });
      return;
    }

    // Create registrations
    const registrations = playerIds.map(playerId => ({
      player: playerId,
      tournament: tournamentId,
      registrationDate: new Date(),
      isActive: true
    }));

    const createdRegistrations = await PlayerRegistration.insertMany(registrations);

    res.status(201).json({
      success: true,
      message: `Successfully registered ${playerIds.length} player(s)`,
      data: createdRegistrations
    });
  } catch (error: any) {
    console.error('Error registering players:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering players',
      error: error.message
    });
  }
}));

export default router;