import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, authorize } from '../middleware/auth';
import { requireCoins } from '../middleware/coinValidation';
import Bracket from '../models/Bracket';
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Player from '../models/Player';

const router = express.Router();

// @desc    Get all brackets
// @route   GET /api/brackets
// @access  Public
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const brackets = await Bracket.find()
    .populate('tournament', 'name gameType format')
    .populate('teams', 'name players averageSkillLevel')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: brackets.length,
    data: brackets
  });
}));

// @desc    Get bracket by bracket ID
// @route   GET /api/brackets/bracket/:bracketId
// @access  Public
router.get('/bracket/:bracketId', asyncHandler(async (req: Request, res: Response) => {
  const bracket = await Bracket.findById(req.params.bracketId)
    .populate('tournament', 'name gameType format gameFormat')
    .populate('teams', 'name players averageSkillLevel')
    .populate({
      path: 'teams',
      populate: {
        path: 'players',
        select: 'firstName lastName skillLevel ranking'
      }
    });

  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: bracket
  });
}));

// @desc    Debug endpoint to check bracket status
// @route   GET /api/brackets/debug/:tournamentId
// @access  Public
router.get('/debug/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId;
  
  console.log('🔍 DEBUG: Checking bracket status for tournament:', tournamentId);
  
  // Get all brackets for this tournament
  const brackets = await Bracket.find({ tournament: tournamentId })
    .populate('tournament', 'name')
    .populate('teams', 'name')
    .sort({ createdAt: -1 });
  
  console.log('📊 DEBUG: Found', brackets.length, 'brackets for tournament');
  
  const debug = {
    tournamentId,
    bracketsFound: brackets.length,
    brackets: brackets.map(b => ({
      id: b._id,
      name: b.name,
      format: b.format,
      status: b.status,
      teamsCount: b.teams?.length || 0,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt
    }))
  };
  
  console.log('📋 DEBUG: Bracket summary:', debug);
  
  res.status(200).json({
    success: true,
    data: debug
  });
}));

// @desc    Get bracket for tournament
// @route   GET /api/brackets/:tournamentId
// @access  Public
router.get('/:tournamentId', asyncHandler(async (req: Request, res: Response) => {
  console.log('🔍 Looking for bracket with tournament ID:', req.params.tournamentId);
  
  const bracket = await Bracket.findOne({ tournament: req.params.tournamentId })
    .populate('tournament', 'name gameType format')
    .populate('teams', 'name players averageSkillLevel')
    .populate({
      path: 'teams',
      populate: {
        path: 'players',
        select: 'firstName lastName skillLevel ranking'
      }
    });

  console.log('📊 Found bracket:', bracket ? 'YES' : 'NO');
  if (bracket) {
    console.log('🎯 Bracket ID:', bracket._id);
    console.log('🎯 Bracket teams count:', bracket.teams?.length || 0);
    console.log('🎯 Bracket created at:', bracket.createdAt);
    console.log('🎯 Bracket updated at:', bracket.updatedAt);
  }

  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found for this tournament'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: bracket
  });
}));

// @desc    Generate/Create bracket
// @route   POST /api/brackets
// @access  Private
router.post('/', protect, authorize('admin', 'organizer', 'club-admin', 'club-organizer'), ...requireCoins('generate_bracket'), asyncHandler(async (req: Request, res: Response) => {
  const { tournamentId, format, bracketData } = req.body;

  if (!tournamentId || !format || !bracketData) {
    res.status(400).json({
      success: false,
      message: 'Tournament ID, format, and bracket data are required'
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
    // Get teams for this tournament
    const teams = await Team.find({ 
      tournament: tournamentId, 
      isActive: true 
    }).sort({ seed: 1 });

    // Delete existing bracket for this tournament
    await Bracket.deleteMany({ tournament: tournamentId });

    // Create new bracket
    const bracket = await Bracket.create({
      tournament: tournamentId,
      name: bracketData.name || `${tournament.name} Bracket`,
      format: format,
      teams: teams.map(t => t._id),
      totalTeams: teams.length,
      totalRounds: bracketData.totalRounds || Math.ceil(Math.log2(teams.length)),
      status: 'active',
      bracketData: bracketData // Store the complete bracket structure
    });

    // Populate the created bracket
    const populatedBracket = await Bracket.findById(bracket._id)
      .populate('tournament', 'name gameType format')
      .populate({
        path: 'teams',
        populate: {
          path: 'players',
          select: 'firstName lastName skillLevel ranking'
        }
      });

    // Note: Auto-scheduling is now triggered after matches are created (in matches.ts route),
    // not when bracket is created, to ensure matches exist when scheduling runs

    res.status(201).json({
      success: true,
      data: populatedBracket,
      message: 'Bracket created successfully'
    });

  } catch (error: any) {
    console.error('Error creating bracket:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create bracket'
    });
  }
}));

// @desc    Update bracket
// @route   PUT /api/brackets/:id
// @access  Private
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const bracket = await Bracket.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('tournament', 'name gameType format')
    .populate({
      path: 'teams',
      populate: {
        path: 'players',
        select: 'firstName lastName skillLevel ranking'
      }
    });

  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found'
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: bracket
  });
}));

// @desc    Delete bracket
// @route   DELETE /api/brackets/:id
// @access  Private
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const bracket = await Bracket.findById(req.params.id);

  if (!bracket) {
    res.status(404).json({
      success: false,
      message: 'Bracket not found'
    });
    return;
  }

  await bracket.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Bracket deleted successfully'
  });
}));

export default router;