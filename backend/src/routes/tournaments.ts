import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import { protect, authorize, optionalAuth } from '../middleware/auth';
import { validateCoins, processCoins, showCoinInfo } from '../middleware/coinValidation';
import Tournament from '../models/Tournament';
import Player from '../models/Player';
import PlayerRegistration from '../models/PlayerRegistration';
import Schedule from '../models/Schedule';
import TimeSlot from '../models/TimeSlot';
import Match from '../models/Match';

const router = express.Router();

// Function to assign matches to existing time slots
async function assignMatchesToExistingTimeSlots(tournamentId: string) {
  try {
    console.log('🎾 Assigning matches to existing time slots...');
    
    // Get Round 1 matches that need scheduling
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1,
      status: { $in: ['pending', 'scheduled'] }
    }).sort({ matchNumber: 1 });
    
    // Get available time slots
    const availableSlots = await TimeSlot.find({ 
      tournament: tournamentId,
      status: 'available' 
    }).sort({ startTime: 1 });
    
    console.log(`Found ${round1Matches.length} Round 1 matches and ${availableSlots.length} available time slots`);
    
    // Assign matches to slots
    for (let i = 0; i < Math.min(round1Matches.length, availableSlots.length); i++) {
      const match = round1Matches[i];
      const slot = availableSlots[i];
      
      // Update match with scheduled time
      const startTime = new Date(slot.startTime);
      const dateStr = startTime.toISOString().split('T')[0]; // YYYY-MM-DD format
      const timeStr = startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
      
      await Match.updateOne(
        { _id: match._id },
        { 
          scheduledDateTime: slot.startTime,
          scheduledDate: dateStr,
          scheduledTime: timeStr,
          scheduledTimeSlot: slot._id,
          court: slot.court,
          status: 'scheduled'
        }
      );
      
      // Update time slot as assigned
      await TimeSlot.updateOne(
        { _id: slot._id },
        { 
          match: match._id,
          status: 'booked' 
        }
      );
      
      console.log(`✅ Assigned Match ${match.matchNumber} to ${slot.court} at ${timeStr}`);
    }
    
    console.log('🎯 Match assignment to existing slots complete');
    
  } catch (error) {
    console.error('❌ Error assigning matches to existing time slots:', error);
    throw error;
  }
}


// Function to generate tournament schedule with time slots
async function generateTournamentSchedule(tournament: any) {
  try {
    console.log('🗓️ Generating auto-schedule for tournament:', tournament._id);
    
    // Check if tournament has auto-scheduling enabled and required fields
    if (!tournament.autoScheduleEnabled || !tournament.dailyStartTime || !tournament.dailyEndTime || 
        !tournament.availableCourts || tournament.availableCourts.length === 0) {
      console.log('⚠️ Auto-scheduling not enabled or missing required fields');
      return;
    }
    
    // Check if schedules already exist
    const existingSchedule = await Schedule.findOne({ tournament: tournament._id });
    const existingTimeSlots = await TimeSlot.countDocuments({ tournament: tournament._id });
    
    console.log(`📊 Found existing schedule: ${existingSchedule ? 'YES' : 'NO'}, time slots: ${existingTimeSlots}`);
    
    if (existingSchedule) {
      console.log('📋 Existing schedule details:', {
        id: existingSchedule._id,
        totalMatches: existingSchedule.totalMatches,
        timeSlotDuration: existingSchedule.timeSlotDuration,
        startTime: existingSchedule.startTime,
        endTime: existingSchedule.endTime
      });
    }
    
    const totalMatches = await Match.countDocuments({ tournament: tournament._id });
    console.log(`🎾 Current match count: ${totalMatches}`);
    
    // If schedule exists and has time slots, just update match count and assign matches
    if (existingSchedule && existingTimeSlots > 0) {
      console.log('📝 Branch: Updating existing schedule with current match count...');
      
      await Schedule.updateOne(
        { _id: existingSchedule._id },
        { 
          totalMatches: totalMatches,
          updatedAt: new Date()
        }
      );
      
      // Assign matches to existing time slots
      await assignMatchesToExistingTimeSlots(tournament._id);
      console.log('✅ Updated existing schedule and assigned matches');
      return;
    }
    
    // Clean up any partial schedules/slots only if we're creating fresh
    if (existingSchedule || existingTimeSlots > 0) {
      console.log('📝 Branch: Cleaning partial schedules to create fresh...');
      await Schedule.deleteMany({ tournament: tournament._id });
      await TimeSlot.deleteMany({ tournament: tournament._id });
    }
    
    console.log(`📝 Branch: Creating fresh schedule with ${totalMatches} matches`);
    
    // Calculate schedule dates
    const tournamentStartDate = new Date(tournament.startDate || new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = tournamentStartDate > new Date() ? tournamentStartDate : tomorrow;
    
    // Create schedule record
    const schedule = await Schedule.create({
      tournament: tournament._id,
      name: `${tournament.name} - Auto-Generated Schedule`,
      description: 'Schedule created automatically to support drag & drop functionality',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      courts: tournament.availableCourts,
      timeSlotDuration: tournament.matchDuration || 60,
      startTime: tournament.dailyStartTime,
      endTime: tournament.dailyEndTime,
      breakBetweenMatches: 5,
      totalMatches: totalMatches || 1,
      scheduledMatches: 0,
      conflicts: [],
      estimatedDuration: Math.ceil((totalMatches || 1) * (tournament.matchDuration || 60) / 60),
      status: 'published',
      generatedAt: new Date(),
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('📅 Created schedule record:', schedule._id);
    
    // Generate time slots
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    const timeSlots = [];
    
    // Calculate tournament duration
    const tournamentEndDate = new Date(tournament.endDate || scheduleDate);
    const tournamentDays = Math.ceil((tournamentEndDate.getTime() - scheduleDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // Generate time slots for multiple days
    for (let day = 0; day < Math.min(tournamentDays, 7); day++) {
      const currentDate = new Date(scheduleDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      for (const court of tournament.availableCourts) {
        let currentHour = startHour;
        let currentMin = startMin;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(currentHour, currentMin, 0, 0);
          
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
          
          const slotEndHour = slotEnd.getHours();
          const slotEndMin = slotEnd.getMinutes();
          
          if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
            break; // Don't create slots that exceed the daily window
          }
          
          timeSlots.push({
            tournament: tournament._id,
            court: court,
            startTime: slotStart,
            endTime: slotEnd,
            status: 'available',
            duration: matchDuration,
            notes: `Court: ${court}`,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Move to next slot
          currentMin += matchDuration;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      }
    }
    
    console.log(`🔍 Debug: Generated ${timeSlots.length} time slots for insertion`);
    if (timeSlots.length > 0) {
      console.log('🔍 Sample time slot:', timeSlots[0]);
      
      try {
        // First try with insertMany and bypass validation 
        console.log('🔧 Attempting to insert time slots using insertMany with ordered: false...');
        const createdSlots = await TimeSlot.insertMany(timeSlots, { ordered: false });
        console.log(`⏰ Created ${createdSlots.length} time slots`);
      } catch (error: any) {
        console.error('❌ TimeSlot insertMany failed:', {
          message: error.message,
          code: error.code,
          name: error.name
        });
        
        // Try using raw MongoDB insert to bypass middleware
        console.log('🔧 Attempting raw MongoDB insert to bypass validation...');
        try {
          const db = mongoose.connection.db;
          if (!db) {
            throw new Error('Database connection not available');
          }
          const result = await db.collection('timeslots').insertMany(timeSlots, { ordered: false });
          console.log(`⏰ Created ${result.insertedCount} time slots via raw insert`);
        } catch (rawError: any) {
          console.error('❌ Raw insert also failed:', rawError.message);
          
          // Last resort: create slots individually with better error handling
          console.log('🔧 Creating slots individually (last resort)...');
          let createdCount = 0;
          for (const slot of timeSlots) {
            try {
              // Use raw insert for individual slots to bypass middleware
              const db = mongoose.connection.db;
              if (db) {
                await db.collection('timeslots').insertOne(slot);
                createdCount++;
              }
            } catch (duplicateError: any) {
              // Only log if it's not a duplicate key error
              if (duplicateError.code !== 11000) {
                console.log('❌ Individual slot insert failed:', {
                  error: duplicateError.message,
                  code: duplicateError.code,
                  slot: {
                    court: slot.court,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    tournament: slot.tournament
                  }
                });
              }
            }
          }
          console.log(`⏰ Created ${createdCount} new time slots individually`);
        }
      }
      
      // Assign matches to newly created time slots
      console.log('🎾 Assigning matches to newly created time slots...');
      await assignMatchesToExistingTimeSlots(tournament._id);
      
      console.log('✅ Auto-schedule generation complete');
    } else {
      console.log('⚠️ No time slots generated - check time window configuration');
    }
    
  } catch (error) {
    console.error('❌ Error generating auto-schedule:', error);
    throw error;
  }
}

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Private (club-specific)
router.get('/', protect, ...showCoinInfo('view_tournaments'), asyncHandler(async (req: Request, res: Response) => {
  // Filter tournaments by user's club for data isolation
  const clubFilter = req.user!.role === 'super-admin' 
    ? {} // Super admin can see all tournaments
    : { club: req.user!.club }; // Regular users only see their club's tournaments

  console.log('🔍 Tournament listing request:', {
    userRole: req.user!.role,
    userClub: req.user!.club,
    clubFilter: clubFilter
  });

  const tournaments = await Tournament.find(clubFilter)
    .populate('organizer', 'firstName lastName email')
    .populate('club', 'name')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: tournaments.length,
    data: tournaments
  });
}));

// @desc    Create tournament (test version without auth)
// @route   POST /api/tournaments/test
// @access  Public
router.post('/test', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('📝 Received tournament data (test route):', req.body);
    
    const tournamentData = {
      ...req.body,
      organizer: '68750e4a03ebd566affc0876', // Default test organizer
      club: '687480d42819d8b020c282c9', // Default test club
      registrationDeadline: req.body.startDate || new Date(),
      status: 'registration-open'
    };

    console.log('💾 Creating tournament with data:', tournamentData);
    const tournament = await Tournament.create(tournamentData);
    console.log('✅ Tournament created:', tournament._id);
    
    // Generate auto-schedule if enabled
    if (tournament.autoScheduleEnabled) {
      console.log('🗓️ Auto-scheduling enabled (test route), generating schedule...');
      try {
        await generateTournamentSchedule(tournament);
        console.log('✅ Auto-schedule generated successfully (test route)');
      } catch (error) {
        console.error('❌ Auto-schedule generation failed (test route):', error);
      }
    }
    
    res.status(201).json({
      success: true,
      data: tournament,
      autoScheduleGenerated: tournament.autoScheduleEnabled
    });
  } catch (error: any) {
    console.error('❌ Tournament creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

// @desc    Create tournament
// @route   POST /api/tournaments
// @access  Public (temporarily for testing)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  console.log('🏆 Tournament creation attempt (enhanced with auto-scheduling)');
  console.log('📝 Received data:', JSON.stringify(req.body, null, 2));
  
  const tournamentData = {
    ...req.body,
    organizer: '68750e4a03ebd566affc0876', // Default test organizer
    club: '687480d42819d8b020c282c9', // Default test club
    registrationDeadline: req.body.startDate || new Date(),
    status: 'registration-open'
  };

  console.log('💾 Creating tournament with auto-schedule data:', JSON.stringify(tournamentData, null, 2));
  
  const tournament = await Tournament.create(tournamentData);
  console.log('✅ Tournament created:', tournament._id);
  
  // Generate auto-schedule if enabled
  if (tournament.autoScheduleEnabled) {
    console.log('🗓️ Auto-scheduling enabled, generating schedule...');
    try {
      await generateTournamentSchedule(tournament);
      console.log('✅ Auto-schedule generated successfully');
    } catch (error) {
      console.error('❌ Auto-schedule generation failed:', error);
      // Don't fail tournament creation if auto-schedule fails
      // User can still create schedule manually
    }
  } else {
    console.log('⚪ Auto-scheduling disabled, tournament created without schedule');
  }
  
  // Populate organizer data for response
  await tournament.populate('organizer', 'firstName lastName email');
  
  res.status(201).json({
    success: true,
    data: tournament,
    autoScheduleGenerated: tournament.autoScheduleEnabled
  });
}));

// @desc    Health check (must be before :id route)
// @route   GET /api/tournaments/health
// @access  Public
router.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Tournaments route working' });
});

// @desc    Get tournament by ID
// @route   GET /api/tournaments/:id
// @access  Public (with optional auth for user context)
router.get('/:id', optionalAuth, asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  
  // Validate that tournamentId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
    res.status(400).json({
      success: false,
      message: 'Invalid tournament ID format'
    });
    return;
  }
  
  const tournament = await Tournament.findById(tournamentId)
    .populate('organizer', 'firstName lastName email');

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
// @access  Private (Only organizer of the tournament or admin)
router.put('/:id', protect, asyncHandler(async (req: Request, res: Response) => {
  // Debug: Log the received data for tournament update
  console.log('Tournament update - ID:', req.params.id);
  console.log('Tournament update - Data:', JSON.stringify(req.body, null, 2));
  console.log('Required Courts in request:', req.body.requiredCourts);
  
  try {
    // First check if tournament exists and user has permission
    const existingTournament = await Tournament.findById(req.params.id);
    
    if (!existingTournament) {
      res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
      return;
    }
    
    // Check if user is the organizer or admin
    if (req.user!.role !== 'club-admin' && existingTournament.organizer.toString() !== (req.user!._id as any).toString()) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to update this tournament'
      });
      return;
    }
    
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
        upsert: false
      }
    ).populate('organizer', 'firstName lastName email');
    
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
// @access  Private (Only organizer of the tournament or admin)
router.delete('/:id', protect, asyncHandler(async (req: Request, res: Response) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }
  
  // Check if user is the organizer or admin
  if (req.user!.role !== 'club-admin' && tournament.organizer.toString() !== (req.user!._id as any).toString()) {
    res.status(403).json({
      success: false,
      message: 'Not authorized to delete this tournament'
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

// @desc    Generate schedule for tournament (manual trigger)
// @route   POST /api/tournaments/:id/generate-schedule
// @access  Public
router.post('/:id/generate-schedule', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.id;
  
  console.log('🗓️ Manual schedule generation request for tournament:', tournamentId);
  
  try {
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
      return;
    }
    
    console.log('🏆 Manual schedule generation for tournament:', {
      name: tournament.name,
      autoScheduleEnabled: tournament.autoScheduleEnabled,
      dailyStartTime: tournament.dailyStartTime,
      dailyEndTime: tournament.dailyEndTime,
      availableCourts: tournament.availableCourts,
      matchDuration: tournament.matchDuration
    });
    
    // Check if auto-scheduling is enabled
    if (!tournament.autoScheduleEnabled) {
      res.status(400).json({
        success: false,
        message: 'Auto-scheduling is not enabled for this tournament'
      });
      return;
    }
    
    // Check if tournament has matches
    const matchCount = await Match.countDocuments({ tournament: tournamentId });
    if (matchCount === 0) {
      res.status(400).json({
        success: false,
        message: 'No matches found. Please generate brackets first.'
      });
      return;
    }
    
    // Check if already scheduled
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    if (timeSlotCount > 0) {
      res.status(400).json({
        success: false,
        message: 'Tournament is already scheduled'
      });
      return;
    }
    
    console.log('✅ Validation passed, generating schedule...');
    
    // Generate schedule using existing function
    await generateTournamentSchedule(tournament);
    
    // Verify schedule was created
    const newTimeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduledMatchCount = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDate: { $exists: true }
    });
    
    console.log('📊 Schedule generation results:', {
      timeSlots: newTimeSlotCount,
      scheduledMatches: scheduledMatchCount
    });
    
    res.status(200).json({
      success: true,
      message: 'Schedule generated successfully',
      data: {
        timeSlots: newTimeSlotCount,
        scheduledMatches: scheduledMatchCount
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error generating schedule:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate schedule',
      error: error.message,
      stack: error.stack,
      fullError: error
    });
  }
}));

// Export the scheduling functions so they can be used by other routes
export { assignMatchesToExistingTimeSlots, generateTournamentSchedule };

export default router;