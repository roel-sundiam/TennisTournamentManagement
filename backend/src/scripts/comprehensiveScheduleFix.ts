import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

// Import models
import '../models/Tournament';
import '../models/Match';
import '../models/TimeSlot';
import '../models/Schedule';

const Tournament = mongoose.model('Tournament');
const Match = mongoose.model('Match');
const TimeSlot = mongoose.model('TimeSlot');
const Schedule = mongoose.model('Schedule');

async function comprehensiveScheduleFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');
    
    // Get the most recent tournament (likely the one being tested)
    const latestTournament = await Tournament.findOne({}).sort({ createdAt: -1 });
    
    if (!latestTournament) {
      console.log('No tournaments found');
      return;
    }
    
    const tournamentId = latestTournament._id;
    console.log(`🏆 Working on latest tournament: ${latestTournament.name} (${tournamentId})`);
    
    // Step 1: Check current state
    console.log('\n=== CURRENT STATE ===');
    
    const matches = await Match.find({ tournament: tournamentId });
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    const schedule = await Schedule.findOne({ tournament: tournamentId });
    
    console.log(`Matches: ${matches.length}`);
    console.log(`Time slots: ${timeSlots.length}`);
    console.log(`Schedule: ${schedule ? 'exists' : 'missing'}`);
    
    const unscheduledMatches = matches.filter(m => !m.scheduledDateTime);
    const orphanedTimeSlots = timeSlots.filter(ts => ts.status === 'booked' && (!ts.match || ts.match === null));
    
    console.log(`Unscheduled matches: ${unscheduledMatches.length}`);
    console.log(`Orphaned time slots: ${orphanedTimeSlots.length}`);
    
    // Step 2: Fix orphaned time slots
    if (orphanedTimeSlots.length > 0) {
      console.log('\n=== FIXING ORPHANED TIME SLOTS ===');
      
      // Fix time slots with no match field
      const result1 = await TimeSlot.updateMany(
        { tournament: tournamentId, status: 'booked', match: { $exists: false } },
        { status: 'available', $unset: { match: 1 } }
      );
      
      // Fix time slots with null match field
      const result2 = await TimeSlot.updateMany(
        { tournament: tournamentId, status: 'booked', match: null },
        { status: 'available', $unset: { match: 1 } }
      );
      
      console.log(`Fixed ${result1.modifiedCount + result2.modifiedCount} orphaned time slots`);
    }
    
    // Step 3: Schedule unscheduled matches
    if (unscheduledMatches.length > 0) {
      console.log('\n=== SCHEDULING UNSCHEDULED MATCHES ===');
      
      // Get available time slots
      const availableSlots = await TimeSlot.find({ 
        tournament: tournamentId, 
        status: 'available' 
      }).sort({ startTime: 1 });
      
      console.log(`Available time slots: ${availableSlots.length}`);
      
      if (availableSlots.length === 0) {
        console.log('❌ No available time slots found - need to create more time slots');
        
        // Create additional time slots if needed
        await createAdditionalTimeSlots(tournamentId, schedule, unscheduledMatches.length);
        
        // Re-fetch available slots
        const newAvailableSlots = await TimeSlot.find({ 
          tournament: tournamentId, 
          status: 'available' 
        }).sort({ startTime: 1 });
        
        console.log(`Created ${newAvailableSlots.length} additional time slots`);
      }
      
      // Re-fetch available slots after potential creation
      const finalAvailableSlots = await TimeSlot.find({ 
        tournament: tournamentId, 
        status: 'available' 
      }).sort({ startTime: 1 });
      
      // Schedule matches
      const maxSchedulable = Math.min(unscheduledMatches.length, finalAvailableSlots.length);
      let scheduledCount = 0;
      
      for (let i = 0; i < maxSchedulable; i++) {
        const match = unscheduledMatches[i];
        const timeSlot = finalAvailableSlots[i];
        
        try {
          // Update match with transaction-like behavior
          const matchUpdateResult = await Match.findByIdAndUpdate(match._id, {
            scheduledTimeSlot: timeSlot._id,
            scheduledDateTime: timeSlot.startTime,
            court: timeSlot.court || `Court ${i + 1}`,
            status: 'scheduled'
          }, { new: true });
          
          if (!matchUpdateResult) {
            throw new Error(`Failed to update match ${match._id}`);
          }
          
          // Update time slot
          const timeSlotUpdateResult = await TimeSlot.findByIdAndUpdate(timeSlot._id, {
            status: 'booked',
            match: match._id
          }, { new: true });
          
          if (!timeSlotUpdateResult) {
            // Rollback match update if time slot update fails
            await Match.findByIdAndUpdate(match._id, {
              $unset: { scheduledTimeSlot: 1, scheduledDateTime: 1 },
              court: null,
              status: 'scheduled'
            });
            throw new Error(`Failed to update time slot ${timeSlot._id}`);
          }
          
          scheduledCount++;
          console.log(`✅ Scheduled Match ${match.matchNumber} to ${timeSlot.startTime}`);
          
        } catch (error: any) {
          console.error(`❌ Error scheduling match ${match.matchNumber}:`, error.message);
          
          // Ensure time slot is available on error
          await TimeSlot.findByIdAndUpdate(timeSlot._id, {
            status: 'available',
            $unset: { match: 1 }
          });
        }
      }
      
      console.log(`📊 Successfully scheduled ${scheduledCount} matches`);
    }
    
    // Step 4: Update schedule record
    if (schedule) {
      const finalMatches = await Match.find({ tournament: tournamentId });
      const scheduledMatches = finalMatches.filter(m => m.scheduledDateTime);
      
      await Schedule.findByIdAndUpdate(schedule._id, {
        scheduledMatches: scheduledMatches.length,
        status: 'published'
      });
      
      console.log(`📋 Updated schedule: ${scheduledMatches.length}/${finalMatches.length} matches scheduled`);
    }
    
    console.log('\n✅ Comprehensive schedule fix completed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

async function createAdditionalTimeSlots(tournamentId: string, schedule: any, requiredSlots: number) {
  if (!schedule) {
    console.log('No schedule found, cannot create additional time slots');
    return;
  }
  
  console.log(`Creating ${requiredSlots} additional time slots...`);
  
  // Get the latest time slot to determine where to start
  const latestTimeSlot = await TimeSlot.findOne({ tournament: tournamentId })
    .sort({ startTime: -1 });
  
  let startTime: Date;
  if (latestTimeSlot) {
    startTime = new Date(latestTimeSlot.endTime);
  } else {
    startTime = new Date(schedule.startDate);
    startTime.setHours(17, 0, 0, 0); // Default to 5 PM
  }
  
  const timeSlots = [];
  const duration = schedule.timeSlotDuration || 90; // 90 minutes default
  const breakTime = schedule.breakBetweenMatches || 15; // 15 minutes default
  
  for (let i = 0; i < requiredSlots; i++) {
    const endTime = new Date(startTime.getTime() + (duration * 60 * 1000));
    
    const timeSlot = {
      startTime: new Date(startTime),
      endTime: endTime,
      court: null,
      tournament: tournamentId,
      status: 'available',
      duration: duration
    };
    
    timeSlots.push(timeSlot);
    
    // Move to next slot (including break time)
    startTime = new Date(endTime.getTime() + (breakTime * 60 * 1000));
  }
  
  // Save all time slots
  await TimeSlot.insertMany(timeSlots);
  console.log(`Created ${timeSlots.length} additional time slots`);
}

// Run the comprehensive fix
comprehensiveScheduleFix();