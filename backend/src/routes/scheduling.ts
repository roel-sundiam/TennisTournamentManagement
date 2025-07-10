import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../middleware/errorHandler';
import Schedule from '../models/Schedule';
import Tournament from '../models/Tournament';
import TimeSlot from '../models/TimeSlot';
import Match from '../models/Match';
import Team from '../models/Team';
import Bracket from '../models/Bracket';

const router = express.Router();

// @desc    Generate tournament schedule
// @route   POST /api/scheduling/generate
// @access  Private
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  console.log('🗓️ Generate schedule request:', req.body);
  
  const { tournamentId, startDate, endDate, courts, timeSlotDuration, startTime, endTime, breakBetweenMatches } = req.body;
  
  // Convert ObjectId format court IDs to simple string IDs that match the mock courts API
  const simplifiedCourts = courts.map((courtId: string) => {
    if (courtId === '000000000000000000000001') return '1';
    if (courtId === '000000000000000000000002') return '2';  
    if (courtId === '000000000000000000000003') return '3';
    return courtId; // fallback to original if no match
  });
  console.log('🏟️ Converted courts from:', courts, 'to:', simplifiedCourts);
  
  // Validate tournament exists
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    res.status(404).json({
      success: false,
      message: 'Tournament not found'
    });
    return;
  }
  
  // Get teams for this tournament to calculate actual matches needed
  const teams = await Team.find({ tournament: tournamentId, isActive: true });
  console.log(`👥 Found ${teams.length} teams for calculating matches`);
  
  // Calculate total matches needed based on actual teams
  let totalMatches = 0;
  switch (tournament.format) {
    case 'single-elimination':
      totalMatches = teams.length - 1;
      break;
    case 'double-elimination':
      totalMatches = (teams.length - 1) * 2;
      break;
    case 'round-robin':
      totalMatches = (teams.length * (teams.length - 1)) / 2;
      break;
    default:
      totalMatches = teams.length - 1;
  }
  console.log('📊 Total matches needed based on teams:', totalMatches);
  
  // Calculate estimated duration
  const estimatedDuration = calculateEstimatedDuration(totalMatches, parseInt(timeSlotDuration), simplifiedCourts.length);
  
  // Delete existing schedule and time slots to force fresh creation
  await Schedule.deleteMany({ tournament: tournamentId });
  await TimeSlot.deleteMany({ tournament: tournamentId });
  console.log('🗑️ Deleted existing schedule and time slots');
  
  // Create new schedule
  const schedule = new Schedule({
    tournament: tournamentId,
    name: `${tournament.name} Schedule`,
    description: `Auto-generated schedule for ${tournament.name}`,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    courts: simplifiedCourts, // Store simplified court IDs that match mock courts API
    timeSlotDuration: parseInt(timeSlotDuration),
    startTime: startTime,
    endTime: endTime,
    breakBetweenMatches: parseInt(breakBetweenMatches),
    totalMatches: totalMatches,
    scheduledMatches: totalMatches,
    conflicts: [],
    estimatedDuration: estimatedDuration,
    status: 'published',
    generatedAt: new Date()
  });
  
  console.log('💾 Attempting to save schedule...');
  await schedule.save();
  console.log('✅ Schedule saved to database:', schedule._id);
  
  // Generate time slots
  await generateTimeSlots(schedule);
  
  // Generate and schedule matches
  await generateAndScheduleMatches(schedule);
  
  res.status(201).json({
    success: true,
    data: {
      tournamentId: schedule.tournament,
      totalMatches: schedule.totalMatches,
      scheduledMatches: schedule.scheduledMatches,
      timeSlots: [], // Will be populated by separate endpoint
      conflicts: schedule.conflicts,
      estimatedDuration: schedule.estimatedDuration
    },
    message: 'Schedule generated and saved successfully'
  });
}));

// @desc    Swap two matches between time slots
// @route   POST /api/scheduling/matches/swap
// @access  Private
router.post('/matches/swap', asyncHandler(async (req: Request, res: Response) => {
  const { match1Id, match2Id } = req.body;
  
  console.log('🔄 Swapping matches:', match1Id, 'and', match2Id);
  
  // Get both matches
  const match1 = await Match.findById(match1Id);
  const match2 = await Match.findById(match2Id);
  
  if (!match1 || !match2) {
    res.status(404).json({
      success: false,
      message: 'One or both matches not found'
    });
    return;
  }
  
  // Get current time slots
  const timeSlot1 = match1.scheduledTimeSlot ? await TimeSlot.findById(match1.scheduledTimeSlot) : null;
  const timeSlot2 = match2.scheduledTimeSlot ? await TimeSlot.findById(match2.scheduledTimeSlot) : null;
  
  if (!timeSlot1 || !timeSlot2) {
    res.status(400).json({
      success: false,
      message: 'Both matches must have scheduled time slots to swap'
    });
    return;
  }
  
  console.log(`🔄 Swapping time slots: ${timeSlot1._id} <-> ${timeSlot2._id}`);
  
  // Perform the swap atomically
  try {
    // Update match 1 to use time slot 2
    await Match.findByIdAndUpdate(match1Id, {
      scheduledTimeSlot: timeSlot2._id,
      scheduledDateTime: timeSlot2.startTime,
      court: timeSlot2.court || 'Court 1'
    });
    
    // Update match 2 to use time slot 1
    await Match.findByIdAndUpdate(match2Id, {
      scheduledTimeSlot: timeSlot1._id,
      scheduledDateTime: timeSlot1.startTime,
      court: timeSlot1.court || 'Court 1'
    });
    
    // Update time slot 1 to point to match 2
    await TimeSlot.findByIdAndUpdate(timeSlot1._id, {
      match: match2Id
    });
    
    // Update time slot 2 to point to match 1
    await TimeSlot.findByIdAndUpdate(timeSlot2._id, {
      match: match1Id
    });
    
    console.log(`✅ Successfully swapped matches ${match1Id} and ${match2Id}`);
    
    res.status(200).json({
      success: true,
      message: 'Matches swapped successfully'
    });
  } catch (error) {
    console.error('❌ Error swapping matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to swap matches',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// @desc    Block invalid "builder" tournament ID
// @route   GET /api/scheduling/builder
// @access  Public
router.get('/builder', (req: Request, res: Response) => {
  console.log('🛑 BLOCKED: Direct access to /builder route');
  res.status(400).json({
    success: false,
    message: 'Invalid tournament ID: "builder" is not a valid tournament ID'
  });
});

// @desc    Get tournament schedule
// @route   GET /api/scheduling/:tournamentId
// @access  Public
router.get('/:tournamentId', async (req: Request, res: Response) => {
  try {
    console.log('🚨 DEBUGGING: Scheduling route hit with params:', req.params);
    console.log('🚨 DEBUGGING: Full URL:', req.url);
    console.log('🚨 DEBUGGING: Method:', req.method);
    const tournamentId = req.params.tournamentId;
    
    console.log('📋 Getting schedule for tournament:', tournamentId);
    console.log('🔍 Tournament ID type:', typeof tournamentId);
    console.log('🔍 Tournament ID length:', tournamentId.length);
    
    // CRITICAL: Stop execution immediately if tournament ID is "builder"
    if (tournamentId === 'builder') {
      console.log('🛑 BLOCKED: Tournament ID is "builder", returning 400');
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID: cannot be "builder"'
      });
    }
    
    // Validate that tournamentId is a valid MongoDB ObjectId
    const isValid = mongoose.Types.ObjectId.isValid(tournamentId);
    console.log('🔍 ObjectId validation result:', isValid);
    
    if (!isValid) {
      console.log('❌ Invalid tournament ID format, returning 400');
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }
    
    console.log('✅ Tournament ID passed validation, proceeding with database query');
  
  // Find schedule for this tournament
  const schedule = await Schedule.findOne({ tournament: tournamentId })
    .populate('tournament', 'name startDate endDate format gameType');
  
  if (!schedule) {
    res.status(404).json({
      success: false,
      message: 'Schedule not found for this tournament'
    });
    return;
  }
  
  // Get time slots for this tournament
  const timeSlots = await TimeSlot.find({ tournament: tournamentId })
    .sort({ startTime: 1 });
  
  console.log(`📅 Found ${timeSlots.length} time slots`);
  
  const responseData = {
    tournamentId: schedule.tournament,
    totalMatches: schedule.totalMatches,
    scheduledMatches: schedule.scheduledMatches,
    timeSlots: timeSlots,
    conflicts: schedule.conflicts,
    estimatedDuration: schedule.estimatedDuration,
    schedule: {
      _id: schedule._id,
      name: schedule.name,
      description: schedule.description,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      courts: schedule.courts,
      timeSlotDuration: schedule.timeSlotDuration,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      breakBetweenMatches: schedule.breakBetweenMatches,
      status: schedule.status,
      generatedAt: schedule.generatedAt
    }
  };
  
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('❌ Error in scheduling route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Block invalid "builder" tournament ID for matches
// @route   GET /api/scheduling/builder/matches
// @access  Public
router.get('/builder/matches', (req: Request, res: Response) => {
  console.log('🛑 BLOCKED: Direct access to /builder/matches route');
  res.status(400).json({
    success: false,
    message: 'Invalid tournament ID: "builder" is not a valid tournament ID'
  });
});

// @desc    Get scheduled matches for a tournament
// @route   GET /api/scheduling/:tournamentId/matches
// @access  Public
router.get('/:tournamentId/matches', async (req: Request, res: Response) => {
  try {
    const tournamentId = req.params.tournamentId;
    
    console.log('⚔️ Getting scheduled matches for tournament:', tournamentId);
    
    // CRITICAL: Stop execution immediately if tournament ID is "builder"
    if (tournamentId === 'builder') {
      console.log('🛑 BLOCKED: Tournament ID is "builder" for matches endpoint, returning 400');
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID: cannot be "builder"'
      });
    }
    
    // Validate that tournamentId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(tournamentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament ID format'
      });
    }
  
  // Get all matches for this tournament with populated team and time slot data
  const matches = await Match.find({ tournament: tournamentId })
    .populate('team1', 'name players')
    .populate('team2', 'name players') 
    .populate('scheduledTimeSlot', 'startTime endTime court status')
    .sort({ round: 1, matchNumber: 1 });
  
    console.log(`📋 Found ${matches.length} matches for tournament`);
    
    res.status(200).json({
      success: true,
      data: matches
    });
  } catch (error) {
    console.error('❌ Error in matches route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// @desc    Reschedule a match to a different time slot
// @route   PUT /api/scheduling/matches/:matchId/reschedule
// @access  Private
router.put('/matches/:matchId/reschedule', asyncHandler(async (req: Request, res: Response) => {
  const matchId = req.params.matchId;
  const { newTimeSlotId } = req.body;
  
  console.log('🔄 Rescheduling match:', matchId, 'to time slot:', newTimeSlotId);
  
  // Get the match and new time slot
  const match = await Match.findById(matchId);
  const newTimeSlot = await TimeSlot.findById(newTimeSlotId);
  
  if (!match) {
    res.status(404).json({
      success: false,
      message: 'Match not found'
    });
    return;
  }
  
  if (!newTimeSlot) {
    res.status(404).json({
      success: false,
      message: 'Time slot not found'
    });
    return;
  }
  
  // Check if the new time slot is available
  if (newTimeSlot.status !== 'available') {
    res.status(400).json({
      success: false,
      message: 'Time slot is not available'
    });
    return;
  }
  
  // Free up the old time slot if it exists
  if (match.scheduledTimeSlot) {
    await TimeSlot.findByIdAndUpdate(match.scheduledTimeSlot, {
      status: 'available',
      $unset: { match: 1 }
    });
  }
  
  // Update the match with new scheduling information
  await Match.findByIdAndUpdate(matchId, {
    scheduledTimeSlot: newTimeSlotId,
    scheduledDateTime: newTimeSlot.startTime,
    court: newTimeSlot.court || 'Court 1'
  });
  
  // Mark the new time slot as booked
  await TimeSlot.findByIdAndUpdate(newTimeSlotId, {
    status: 'booked',
    match: matchId
  });
  
  console.log(`✅ Match ${matchId} rescheduled to ${newTimeSlot.startTime}`);
  
  res.status(200).json({
    success: true,
    message: 'Match rescheduled successfully'
  });
}));

// Helper functions for schedule generation

function calculateTotalMatches(tournament: any): number {
  // For doubles tournaments, we need to calculate based on teams, not individual players
  let teams = tournament.maxPlayers || tournament.currentPlayers || 8;
  
  // If it's a doubles tournament, divide by 2 to get number of teams
  if (tournament.gameType === 'doubles') {
    teams = teams / 2;
  }
  
  switch (tournament.format) {
    case 'single-elimination':
      return teams - 1;
    case 'double-elimination':
      return (teams - 1) * 2;
    case 'round-robin':
      return (teams * (teams - 1)) / 2;
    default:
      return teams - 1;
  }
}

function calculateEstimatedDuration(totalMatches: number, timeSlotDuration: number, courtCount: number): number {
  // Calculate total minutes needed
  const totalMinutes = totalMatches * timeSlotDuration;
  
  // Divide by number of courts (parallel matches)
  const parallelMinutes = totalMinutes / courtCount;
  
  // Convert to hours and round up
  return Math.ceil(parallelMinutes / 60);
}

async function generateTimeSlots(schedule: any): Promise<void> {
  try {
    console.log('⏰ Generating time slots for schedule:', schedule._id);
    
    // Clear existing time slots for this tournament
    await TimeSlot.deleteMany({ tournament: schedule.tournament });
    
    const startDate = new Date(schedule.startDate);
    const endDate = new Date(schedule.endDate);
    const courts = schedule.courts;
    
    const timeSlots: any[] = [];
    let slotsGenerated = 0;
    
    // Generate time slots for each day
    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
      // Parse start and end times
      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      
      // Generate slots for each court on this day  
      for (const courtId of courts) {
        console.log('🏟️ Creating slots for court:', courtId);
        
        let currentTime = new Date(currentDate);
        currentTime.setHours(startHour, startMin, 0, 0);
        
        const dayEndTime = new Date(currentDate);
        dayEndTime.setHours(endHour, endMin, 0, 0);
        
        // Generate time slots throughout the day
        while (currentTime < dayEndTime) {
          const slotEndTime = new Date(currentTime.getTime() + (schedule.timeSlotDuration * 60 * 1000));
          
          if (slotEndTime <= dayEndTime) {
            const timeSlot = {
              startTime: new Date(currentTime),
              endTime: slotEndTime,
              court: null, // Set to null to avoid Court model validation
              tournament: schedule.tournament,
              status: 'available',
              duration: schedule.timeSlotDuration
            };
            
            timeSlots.push(timeSlot);
            slotsGenerated++;
          }
          
          // Move to next slot (including break time)
          currentTime = new Date(slotEndTime.getTime() + (schedule.breakBetweenMatches * 60 * 1000));
        }
      }
    }
    
    // Save all time slots to database
    if (timeSlots.length > 0) {
      console.log(`📝 Saving ${timeSlots.length} time slots to database...`);
      await TimeSlot.insertMany(timeSlots, { ordered: false });
      console.log(`✅ Generated ${slotsGenerated} time slots`);
    }
    
  } catch (error) {
    console.error('❌ Error generating time slots:', error);
    throw error; // Throw error to see what's going wrong
  }
}

async function generateAndScheduleMatches(schedule: any): Promise<void> {
  try {
    console.log('⚔️ Generating and scheduling matches for tournament:', schedule.tournament);
    
    // Clear existing matches for this tournament
    await Match.deleteMany({ tournament: schedule.tournament });
    
    // Get tournament details
    const tournament = await Tournament.findById(schedule.tournament);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    // Get teams/participants for this tournament
    const teams = await Team.find({ tournament: schedule.tournament, isActive: true })
      .sort({ seed: 1 });
    
    console.log(`👥 Found ${teams.length} teams for tournament`);
    
    if (teams.length < 2) {
      console.log('⚠️ Not enough teams to generate matches');
      return;
    }
    
    // Generate matches based on tournament format
    const matches = await generateMatches(tournament, teams);
    console.log(`⚔️ Generated ${matches.length} matches`);
    
    // Get available time slots
    const timeSlots = await TimeSlot.find({ 
      tournament: schedule.tournament,
      status: 'available'
    }).sort({ startTime: 1 });
    
    console.log(`⏰ Found ${timeSlots.length} available time slots`);
    
    // Schedule matches into time slots
    await scheduleMatchesToTimeSlots(matches, timeSlots);
    
  } catch (error) {
    console.error('❌ Error generating and scheduling matches:', error);
    throw error; // Throw error to see what's going wrong
  }
}

async function generateMatches(tournament: any, teams: any[]): Promise<any[]> {
  const matches: any[] = [];
  
  switch (tournament.format) {
    case 'single-elimination':
      return generateSingleEliminationMatches(tournament, teams);
    case 'round-robin':
      return generateRoundRobinMatches(tournament, teams);
    default:
      return generateSingleEliminationMatches(tournament, teams);
  }
}

async function generateSingleEliminationMatches(tournament: any, teams: any[]): Promise<any[]> {
  const matches: any[] = [];
  let currentTeams = [...teams];
  let round = 1;
  let matchNumber = 1;
  
  // Create bracket if it doesn't exist
  const existingBracket = await Bracket.findOne({ tournament: tournament._id });
  let bracket = existingBracket;
  
  if (!bracket) {
    bracket = new Bracket({
      tournament: tournament._id,
      name: `${tournament.name} Bracket`,
      format: 'single-elimination',
      teams: teams.map(team => team._id),
      totalTeams: teams.length,
      totalRounds: Math.ceil(Math.log2(teams.length)),
      status: 'active'
    });
    await bracket.save();
  }
  
  // Generate rounds until we have a winner
  while (currentTeams.length > 1) {
    console.log(`🏆 Generating Round ${round} with ${currentTeams.length} teams`);
    
    const roundMatches: any[] = [];
    const nextRoundTeams: any[] = [];
    
    // Pair up teams for this round
    for (let i = 0; i < currentTeams.length; i += 2) {
      if (i + 1 < currentTeams.length) {
        // Normal match with two teams
        const match = {
          tournament: tournament._id,
          round: round,
          matchNumber: matchNumber++,
          team1: currentTeams[i]._id,
          team2: currentTeams[i + 1]._id,
          status: 'scheduled',
          matchFormat: 'best-of-3',
          estimatedDuration: 90, // 90 minutes default
          bracket: bracket._id,
          bracketPosition: {
            round: round,
            position: Math.floor(i / 2) + 1
          }
        };
        
        roundMatches.push(match);
        
        // Add placeholder for winner (will be determined later)
        nextRoundTeams.push(null);
      } else {
        // Odd number of teams - this team gets a bye
        nextRoundTeams.push(currentTeams[i]);
      }
    }
    
    matches.push(...roundMatches);
    currentTeams = nextRoundTeams;
    round++;
  }
  
  // Save all matches to database
  if (matches.length > 0) {
    const savedMatches = await Match.insertMany(matches);
    console.log(`✅ Saved ${savedMatches.length} matches to database`);
  }
  
  return matches;
}

async function generateRoundRobinMatches(tournament: any, teams: any[]): Promise<any[]> {
  const matches: any[] = [];
  let matchNumber = 1;
  
  // Create bracket if it doesn't exist
  const existingBracket = await Bracket.findOne({ tournament: tournament._id });
  let bracket = existingBracket;
  
  if (!bracket) {
    bracket = new Bracket({
      tournament: tournament._id,
      name: `${tournament.name} Bracket`,
      format: 'round-robin',
      teams: teams.map(team => team._id),
      totalTeams: teams.length,
      totalRounds: teams.length - 1,
      status: 'active'
    });
    await bracket.save();
  }
  
  // Generate all possible team combinations
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const match = {
        tournament: tournament._id,
        round: 1, // All matches are in round 1 for round-robin
        matchNumber: matchNumber++,
        team1: teams[i]._id,
        team2: teams[j]._id,
        status: 'scheduled',
        matchFormat: 'best-of-3',
        estimatedDuration: 90,
        bracket: bracket._id,
        bracketPosition: {
          round: 1,
          position: matchNumber - 1
        }
      };
      
      matches.push(match);
    }
  }
  
  // Save all matches to database
  if (matches.length > 0) {
    const savedMatches = await Match.insertMany(matches);
    console.log(`✅ Saved ${savedMatches.length} round-robin matches to database`);
  }
  
  return matches;
}

async function scheduleMatchesToTimeSlots(matches: any[], timeSlots: any[]): Promise<void> {
  console.log(`📅 Scheduling ${matches.length} matches into ${timeSlots.length} time slots`);
  
  if (timeSlots.length === 0) {
    console.log('⚠️ No time slots available for scheduling');
    return;
  }
  
  // Simple scheduling algorithm: assign matches to time slots in order
  // More sophisticated algorithms could consider court preferences, team availability, etc.
  
  let timeSlotIndex = 0;
  
  for (let i = 0; i < matches.length; i++) {
    if (timeSlotIndex >= timeSlots.length) {
      console.log('⚠️ Ran out of time slots, some matches will remain unscheduled');
      break;
    }
    
    const match = matches[i];
    const timeSlot = timeSlots[timeSlotIndex];
    
    try {
      // Update the match with scheduling information
      await Match.findByIdAndUpdate(match._id || match.id, {
        scheduledTimeSlot: timeSlot._id,
        scheduledDateTime: timeSlot.startTime,
        court: timeSlot.court || 'Court 1', // Fallback court name
        estimatedDuration: match.estimatedDuration || 90
      });
      
      // Mark the time slot as booked
      await TimeSlot.findByIdAndUpdate(timeSlot._id, {
        status: 'booked',
        match: match._id || match.id
      });
      
      console.log(`✅ Scheduled Match ${match.matchNumber} to time slot ${timeSlot.startTime}`);
      
      timeSlotIndex++;
    } catch (error) {
      console.error(`❌ Error scheduling match ${match.matchNumber}:`, error);
    }
  }
  
  console.log(`📋 Successfully scheduled ${Math.min(matches.length, timeSlots.length)} matches`);
}

// @desc    Test match generation directly
// @route   POST /api/scheduling/:tournamentId/test-matches
// @access  Public
router.post('/:tournamentId/test-matches', asyncHandler(async (req: Request, res: Response) => {
  const tournamentId = req.params.tournamentId;
  
  try {
    console.log('🧪 Testing match generation for tournament:', tournamentId);
    
    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      res.status(404).json({ success: false, message: 'Tournament not found' });
      return;
    }
    
    // Get teams for this tournament
    const teams = await Team.find({ tournament: tournamentId, isActive: true })
      .sort({ seed: 1 });
    
    console.log(`👥 Found ${teams.length} teams`);
    
    if (teams.length < 2) {
      res.status(400).json({ 
        success: false, 
        message: 'Not enough teams to generate matches',
        teams: teams.length 
      });
      return;
    }
    
    // Clear existing matches
    await Match.deleteMany({ tournament: tournamentId });
    console.log('🗑️ Cleared existing matches');
    
    // Test bracket creation
    await Bracket.deleteMany({ tournament: tournamentId });
    const bracket = new Bracket({
      tournament: tournamentId,
      name: `${tournament.name} Test Bracket`,
      format: 'single-elimination',
      teams: teams.map(team => team._id),
      totalTeams: teams.length,
      totalRounds: Math.ceil(Math.log2(teams.length)),
      status: 'active'
    });
    await bracket.save();
    console.log('✅ Created test bracket');
    
    // Generate matches
    const matches: any[] = [];
    let currentTeams = [...teams];
    let round = 1;
    let matchNumber = 1;
    
    while (currentTeams.length > 1) {
      console.log(`🏆 Generating Round ${round} with ${currentTeams.length} teams`);
      
      for (let i = 0; i < currentTeams.length; i += 2) {
        if (i + 1 < currentTeams.length) {
          const match = {
            tournament: tournamentId,
            round: round,
            matchNumber: matchNumber++,
            team1: currentTeams[i]._id,
            team2: currentTeams[i + 1]._id,
            status: 'scheduled',
            matchFormat: 'best-of-3',
            estimatedDuration: 90,
            bracket: bracket._id,
            bracketPosition: {
              round: round,
              position: Math.floor(i / 2) + 1
            }
          };
          
          matches.push(match);
        }
      }
      
      // Simulate next round (half the teams)
      const nextRoundSize = Math.ceil(currentTeams.length / 2);
      currentTeams = currentTeams.slice(0, nextRoundSize);
      round++;
    }
    
    console.log(`⚔️ Generated ${matches.length} test matches`);
    
    // Save matches
    if (matches.length > 0) {
      const savedMatches = await Match.insertMany(matches);
      console.log(`✅ Saved ${savedMatches.length} matches to database`);
      
      res.status(200).json({
        success: true,
        data: {
          matches: savedMatches.length,
          teams: teams.length,
          brackets: 1
        },
        message: 'Test matches generated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No matches were generated'
      });
    }
    
  } catch (error) {
    console.error('❌ Test match generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Test match generation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

export default router;