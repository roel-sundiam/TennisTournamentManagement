import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import PlayerRegistration from '../models/PlayerRegistration';
import Player from '../models/Player';
import Tournament from '../models/Tournament';

const router = express.Router();

// @desc    Get player registrations for a tournament
// @route   GET /api/player-registrations/tournament/:tournamentId
// @access  Public
router.get('/tournament/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  const registrations = await PlayerRegistration.find({ 
    tournament: req.params.tournamentId,
    isActive: true 
  })
  .populate('player', 'firstName lastName email phone skillLevel ranking')
  .sort({ seed: 1, registrationDate: 1 });

  res.status(200).json({
    success: true,
    count: registrations.length,
    data: registrations
  });
}));

// @desc    Register players for a tournament
// @route   POST /api/player-registrations/tournament/:tournamentId/register
// @access  Private
router.post('/tournament/:tournamentId/register', asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  const { playerIds } = req.body;

  console.log('🔍 Registration request:', { tournamentId, playerIds });

  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    console.log('❌ Invalid playerIds array');
    res.status(400).json({
      success: false,
      message: 'Player IDs array is required'
    });
    return;
  }

  // Verify tournament exists
  const tournament = await Tournament.findById(tournamentId);
  console.log('🔍 Tournament found:', tournament ? 'Yes' : 'No');
  if (!tournament) {
    console.log('❌ Tournament not found');
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }

  // Verify all players exist
  const players = await Player.find({ _id: { $in: playerIds }, isActive: true });
  console.log('🔍 Players found:', players.length, 'of', playerIds.length);
  if (players.length !== playerIds.length) {
    console.log('❌ Some players not found');
    res.status(400).json({
      success: false,
      message: 'One or more players not found'
    });
    return;
  }

  // Check if tournament has capacity
  const existingRegistrations = await PlayerRegistration.countDocuments({
    tournament: tournamentId,
    isActive: true
  });
  console.log('🔍 Existing registrations:', existingRegistrations);
  console.log('🔍 Tournament max players:', tournament.maxPlayers);
  console.log('🔍 Available spots:', tournament.maxPlayers - existingRegistrations);

  if (existingRegistrations + playerIds.length > tournament.maxPlayers) {
    console.log('❌ Tournament capacity exceeded');
    res.status(400).json({
      success: false,
      message: `Tournament capacity exceeded. Available spots: ${tournament.maxPlayers - existingRegistrations}`
    });
    return;
  }

  // Check for duplicate registrations
  const existingPlayerRegistrations = await PlayerRegistration.find({
    tournament: tournamentId,
    player: { $in: playerIds },
    isActive: true
  });

  if (existingPlayerRegistrations.length > 0) {
    res.status(400).json({
      success: false,
      message: 'One or more players are already registered for this tournament'
    });
    return;
  }

  try {
    // Create registrations
    const registrations = playerIds.map(playerId => ({
      player: playerId,
      tournament: tournamentId,
      registrationDate: new Date(),
      isActive: true
    }));

    const createdRegistrations = await PlayerRegistration.insertMany(registrations);

    // Update tournament player count
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { currentPlayers: playerIds.length }
    });

    res.status(201).json({
      success: true,
      message: `Successfully registered ${playerIds.length} player(s)`,
      data: createdRegistrations
    });
  } catch (error: any) {
    console.error('Error registering players:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering players'
    });
  }
}));

// @desc    Unregister a player from a tournament
// @route   DELETE /api/player-registrations/:registrationId
// @access  Private
router.delete('/:registrationId', asyncHandler(async (req: Request, res: Response) => {
  const registration = await PlayerRegistration.findById(req.params.registrationId);

  if (!registration) {
    res.status(404).json({
      success: false,
      message: 'Registration not found'
    });
    return;
  }

  // Soft delete - mark as inactive
  await PlayerRegistration.findByIdAndUpdate(req.params.registrationId, {
    isActive: false
  });

  // Update tournament player count
  await Tournament.findByIdAndUpdate(registration.tournament, {
    $inc: { currentPlayers: -1 }
  });

  res.status(200).json({
    success: true,
    message: 'Player unregistered successfully'
  });
}));

// @desc    Update player registration (e.g., seeding)
// @route   PUT /api/player-registrations/:registrationId
// @access  Private
router.put('/:registrationId', asyncHandler(async (req: Request, res: Response) => {
  const { seed, notes } = req.body;

  const registration = await PlayerRegistration.findById(req.params.registrationId);

  if (!registration) {
    res.status(404).json({
      success: false,
      message: 'Registration not found'
    });
    return;
  }

  // Check for duplicate seeds if seed is being updated
  if (seed && seed !== registration.seed) {
    const existingSeed = await PlayerRegistration.findOne({
      tournament: registration.tournament,
      seed: seed,
      isActive: true,
      _id: { $ne: req.params.registrationId }
    });

    if (existingSeed) {
      res.status(400).json({
        success: false,
        message: `Seed ${seed} is already assigned to another player`
      });
      return;
    }
  }

  const updatedRegistration = await PlayerRegistration.findByIdAndUpdate(
    req.params.registrationId,
    { seed, notes },
    { new: true, runValidators: true }
  ).populate('player', 'firstName lastName email phone skillLevel ranking');

  res.status(200).json({
    success: true,
    data: updatedRegistration
  });
}));

// @desc    Update multiple player registrations seeding for a tournament
// @route   PUT /api/player-registrations/tournament/:tournamentId/seeding
// @access  Private
router.put('/tournament/:tournamentId/seeding', asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  const { seedingUpdates } = req.body; // Array of { playerId, seed }

  if (!Array.isArray(seedingUpdates)) {
    res.status(400).json({
      success: false,
      message: 'Seeding updates array is required'
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
    // Update each registration's seed
    const updatePromises = seedingUpdates.map(async (update: any) => {
      return await PlayerRegistration.findOneAndUpdate(
        { 
          tournament: tournamentId, 
          player: update.playerId, 
          isActive: true 
        },
        { seed: update.seed },
        { new: true, runValidators: true }
      ).populate('player', 'firstName lastName email phone skillLevel ranking');
    });

    const updatedRegistrations = await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Seeding updated successfully',
      data: updatedRegistrations.filter(reg => reg !== null)
    });
  } catch (error: any) {
    console.error('Error updating seeding:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating seeding'
    });
  }
}));

export default router;