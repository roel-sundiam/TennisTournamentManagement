import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import Tournament from '../models/Tournament';
import Player from '../models/Player';
import PlayerRegistration from '../models/PlayerRegistration';

const router = express.Router();

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const tournaments = await Tournament.find()
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tournaments.length,
    data: tournaments
  });
}));

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Private
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  // For now, use a default organizer ID - in production you'd get this from auth middleware
  const defaultOrganizerId = '507f1f77bcf86cd799439011'; // Placeholder ObjectId
  
  const tournamentData = {
    ...req.body,
    organizer: defaultOrganizerId,
    registrationDeadline: req.body.startDate || new Date(),
    status: 'registration-open'
  };

  const tournament = await Tournament.create(tournamentData);
  
  res.status(201).json({
    success: true,
    data: tournament
  });
}));

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  
  // Validate that tournamentId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid tournament ID format'
    });
    return;
  }
  
  const tournament = await Tournament.findById(tournamentId);

  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: tournament
  });
}));

// @desc    Update tournament
// @route   PUT /api/tournaments/:id
// @access  Private
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  // Debug: Log the received data for tournament update
  console.log('Tournament update - ID:', req.params.id);
  console.log('Tournament update - Data:', JSON.stringify(req.body, null, 2));
  console.log('Required Courts in request:', req.body.requiredCourts);
  
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
        upsert: false
      }
    );
    
    console.log('Updated tournament requiredCourts:', tournament?.requiredCourts);
    console.log('Full updated tournament:', JSON.stringify(tournament, null, 2));
    
    if (!tournament) {
      res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: tournament
    });
    return;
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating tournament',
      error: error
    });
    return;
  }
}));

// @desc    Delete tournament
// @route   DELETE /api/tournaments/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  await tournament.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Tournament deleted successfully'
  });
}));

// @desc    Register players for a tournament
// @route   POST /api/tournaments/:id/register
// @access  Public
router.post('/:id/register', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  const { playerIds } = req.body;

  console.log('🎾 Tournament registration request:', { tournamentId, playerIds });

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    res.status(400).json({
      success: false,
      message: 'Player IDs array is required'
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

  // Verify all players exist
  const players = await Player.find({ _id: { $in: playerIds }, isActive: true });
  if (players.length !== playerIds.length) {
    res.status(400).json({
      success: false,
      message: 'One or more players not found'
    });
    return;
  }

  // Check for duplicate registrations
  const existingRegistrations = await PlayerRegistration.find({
    tournament: tournamentId,
    player: { $in: playerIds },
    isActive: true
  });

  if (existingRegistrations.length > 0) {
    const alreadyRegistered = existingRegistrations.map((reg: any) => reg.player.toString());
    res.status(400).json({
      success: false,
      message: `Some players are already registered: ${alreadyRegistered.join(', ')}`
    });
    return;
  }

  // Create registrations
  const registrations = playerIds.map((playerId: string, index: number) => ({
    player: playerId,
    tournament: tournamentId,
    registrationDate: new Date(),
    isActive: true,
    seed: index + 1
  }));

  const createdRegistrations = await PlayerRegistration.insertMany(registrations);

  // Update tournament player count
  await Tournament.findByIdAndUpdate(tournamentId, {
    $inc: { currentPlayers: playerIds.length }
  });

  console.log('✅ Successfully created registrations:', createdRegistrations.length);

  res.status(201).json({
    success: true,
    message: `Successfully registered ${playerIds.length} player(s)`,
    data: createdRegistrations
  });
}));

export default router;