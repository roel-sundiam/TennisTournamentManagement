import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../models'; // Import all models
import Match from '../models/Match';
import TimeSlot from '../models/TimeSlot';
import Tournament from '../models/Tournament';

// Load environment variables
dotenv.config();

async function fixSchedulingData() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('📊 Connected to MongoDB');

    const tournamentId = '687717b190351d9b076640c2';
    
    // Get tournament info
    const tournament = await Tournament.findById(tournamentId);
    console.log('🏆 Tournament:', tournament?.name);

    // Get all matches for this tournament
    const matches = await Match.find({ tournament: tournamentId })
      .sort({ round: 1, matchNumber: 1 });
    console.log(`⚔️ Found ${matches.length} matches`);

    // Get all time slots for this tournament
    const timeSlots = await TimeSlot.find({ tournament: tournamentId })
      .sort({ startTime: 1 });
    console.log(`⏰ Found ${timeSlots.length} time slots`);

    // Debug current state
    console.log('\n=== CURRENT STATE ===');
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

    // Fix the scheduling by linking matches to time slots
    console.log('\n=== FIXING SCHEDULING ===');
    
    for (let i = 0; i < Math.min(matches.length, timeSlots.length); i++) {
      const match = matches[i];
      const timeSlot = timeSlots[i];
      
      console.log(`🔗 Linking Match ${match.matchNumber} to TimeSlot ${i + 1}`);
      
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
      .populate('scheduledTimeSlot', 'startTime endTime court status')
      .sort({ round: 1, matchNumber: 1 });
    
    updatedMatches.forEach((match, index) => {
      console.log(`✅ Updated Match ${index + 1}:`, {
        _id: (match as any)._id.toString(),
        round: match.round,
        matchNumber: match.matchNumber,
        scheduledDateTime: match.scheduledDateTime,
        scheduledTimeSlot: match.scheduledTimeSlot,
        court: match.court,
        status: match.status
      });
    });

    console.log('\n🎉 Scheduling data fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing scheduling data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from MongoDB');
  }
}

fixSchedulingData();