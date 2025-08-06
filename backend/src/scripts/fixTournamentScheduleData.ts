import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models'; // Import all models
import Match from '../models/Match';
import TimeSlot from '../models/TimeSlot';
import Tournament from '../models/Tournament';

// Load environment variables
dotenv.config();

async function fixTournamentScheduleData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('📊 Connected to MongoDB');

    const tournamentId = '687717b190351d9b076640c2';
    
    console.log('\n=== ANALYZING CURRENT STATE ===');
    
    // Get tournament info
    const tournament = await Tournament.findById(tournamentId);
    console.log('🏆 Tournament:', tournament?.name);

    // Get all matches for this tournament
    const matches = await Match.find({ tournament: tournamentId });
    console.log(`⚔️ Found ${matches.length} matches`);

    // Get all time slots for this tournament
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log(`⏰ Found ${timeSlots.length} time slots`);

    // Debug current state
    console.log('\n=== MATCHES STATE ===');
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`, {
        _id: (match as any)._id.toString(),
        round: match.round,
        matchNumber: match.matchNumber,
        scheduledDateTime: match.scheduledDateTime,
        scheduledTimeSlot: match.scheduledTimeSlot?.toString(),
        court: match.court,
        status: match.status
      });
    });

    console.log('\n=== TIME SLOTS STATE ===');
    timeSlots.forEach((slot, index) => {
      console.log(`TimeSlot ${index + 1}:`, {
        _id: (slot as any)._id.toString(),
        startTime: slot.startTime,
        endTime: slot.endTime,
        court: slot.court,
        status: slot.status,
        match: (slot as any).match?.toString()
      });
    });

    // Fix the data inconsistency
    console.log('\n=== FIXING DATA INCONSISTENCY ===');
    
    // Reset all time slots to available
    await TimeSlot.updateMany(
      { tournament: tournamentId },
      { 
        status: 'available',
        $unset: { match: 1 }
      }
    );
    console.log('✅ Reset all time slots to available status');

    // Clear scheduling info from all matches
    await Match.updateMany(
      { tournament: tournamentId },
      { 
        $unset: { 
          scheduledTimeSlot: 1,
          scheduledDateTime: 1,
          court: 1
        }
      }
    );
    console.log('✅ Cleared scheduling info from all matches');

    // Now properly link matches to time slots
    console.log('\n=== RE-LINKING MATCHES TO TIME SLOTS ===');
    
    const availableSlots = await TimeSlot.find({ 
      tournament: tournamentId,
      status: 'available'
    }).sort({ startTime: 1 });
    
    const unscheduledMatches = await Match.find({ 
      tournament: tournamentId,
      scheduledDateTime: { $exists: false }
    }).sort({ round: 1, matchNumber: 1 });
    
    console.log(`📋 Available slots: ${availableSlots.length}`);
    console.log(`⚔️ Unscheduled matches: ${unscheduledMatches.length}`);
    
    const maxSchedulable = Math.min(unscheduledMatches.length, availableSlots.length);
    
    for (let i = 0; i < maxSchedulable; i++) {
      const match = unscheduledMatches[i];
      const timeSlot = availableSlots[i];
      
      console.log(`🔗 Linking Match ${match.matchNumber} to TimeSlot starting at ${timeSlot.startTime}`);
      
      // Update match with scheduling information
      await Match.findByIdAndUpdate(match._id, {
        scheduledTimeSlot: timeSlot._id,
        scheduledDateTime: timeSlot.startTime,
        court: timeSlot.court || 'Court 1'
      });
      
      // Update time slot with match reference
      await TimeSlot.findByIdAndUpdate(timeSlot._id, {
        status: 'booked',
        match: match._id
      });
      
      console.log(`✅ Fixed: Match ${match.matchNumber} → ${timeSlot.startTime}`);
    }

    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const updatedMatches = await Match.find({ tournament: tournamentId })
      .sort({ round: 1, matchNumber: 1 });
    
    const updatedTimeSlots = await TimeSlot.find({ tournament: tournamentId })
      .sort({ startTime: 1 });
    
    console.log('\n=== UPDATED MATCHES ===');
    updatedMatches.forEach((match, index) => {
      console.log(`✅ Match ${index + 1}:`, {
        _id: (match as any)._id.toString(),
        round: match.round,
        matchNumber: match.matchNumber,
        scheduledDateTime: match.scheduledDateTime,
        court: match.court,
        status: match.status
      });
    });

    console.log('\n=== UPDATED TIME SLOTS ===');
    updatedTimeSlots.forEach((slot, index) => {
      console.log(`✅ TimeSlot ${index + 1}:`, {
        _id: (slot as any)._id.toString(),
        startTime: slot.startTime,
        status: slot.status,
        match: (slot as any).match?.toString()
      });
    });

    console.log('\n🎉 Tournament schedule data fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing tournament schedule data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

fixTournamentScheduleData();