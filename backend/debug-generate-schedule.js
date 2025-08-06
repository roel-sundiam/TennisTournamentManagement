const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;
const Schedule = require('./dist/models/Schedule').default;
const TimeSlot = require('./dist/models/TimeSlot').default;
const Match = require('./dist/models/Match').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function debugGenerateSchedule() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879a0eeca3117be4e088335';
    
    // Get tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('🏆 Tournament found:', {
      name: tournament.name,
      autoScheduleEnabled: tournament.autoScheduleEnabled,
      dailyStartTime: tournament.dailyStartTime,
      dailyEndTime: tournament.dailyEndTime,
      availableCourts: tournament.availableCourts,
      matchDuration: tournament.matchDuration,
      startDate: tournament.startDate,
      endDate: tournament.endDate
    });
    
    // Check existing schedule and time slots
    const existingSchedule = await Schedule.findOne({ tournament: tournamentId });
    const existingTimeSlots = await TimeSlot.countDocuments({ tournament: tournamentId });
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    
    console.log('📊 Current state:', {
      existingSchedule: existingSchedule ? 'YES' : 'NO',
      existingTimeSlots,
      totalMatches
    });
    
    if (!tournament.autoScheduleEnabled) {
      console.log('❌ Auto-scheduling not enabled');
      return;
    }
    
    if (!tournament.dailyStartTime || !tournament.dailyEndTime) {
      console.log('❌ Missing daily start/end time');
      return;
    }
    
    if (!tournament.availableCourts || tournament.availableCourts.length === 0) {
      console.log('❌ No available courts');
      return;
    }
    
    // Test time slot generation logic
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    
    console.log('⏰ Time configuration:', {
      startHour, startMin, endHour, endMin, matchDuration
    });
    
    // Calculate tournament duration in days
    const tournamentStartDate = new Date(tournament.startDate || new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = tournamentStartDate > new Date() ? tournamentStartDate : tomorrow;
    
    const tournamentEndDate = new Date(tournament.endDate || scheduleDate);
    const tournamentDays = Math.ceil((tournamentEndDate.getTime() - scheduleDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    console.log('📅 Date calculation:', {
      tournamentStartDate: tournamentStartDate.toISOString(),
      scheduleDate: scheduleDate.toISOString(),
      tournamentEndDate: tournamentEndDate.toISOString(),
      tournamentDays: tournamentDays
    });
    
    // Test time slot generation
    const timeSlots = [];
    for (let day = 0; day < Math.min(tournamentDays, 7); day++) {
      const currentDate = new Date(scheduleDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      console.log(`📅 Generating slots for day ${day + 1}: ${currentDate.toDateString()}`);
      
      for (const court of tournament.availableCourts) {
        let currentHour = startHour;
        let currentMin = startMin;
        let slotsForCourt = 0;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(currentHour, currentMin, 0, 0);
        
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
          
          // Check if slot end time exceeds daily end time
          const slotEndHour = slotEnd.getHours();
          const slotEndMin = slotEnd.getMinutes();
          
          if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
            console.log(`⚠️ Slot would exceed daily window: ${slotEndHour}:${slotEndMin.toString().padStart(2, '0')} > ${endHour}:${endMin.toString().padStart(2, '0')}`);
            break; // Don't create slots that exceed the daily window
          }
          
          slotsForCourt++;
          timeSlots.push({
            tournament: tournamentId,
            court: court,
            startTime: slotStart,
            endTime: slotEnd,
            status: 'available',
            duration: matchDuration,
            notes: `Court: ${court}`
          });
          
          console.log(`   ⏰ ${court}: ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}`);
          
          // Move to next slot
          currentMin += matchDuration;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
        
        console.log(`   📊 ${court}: ${slotsForCourt} slots`);
      }
    }
    
    console.log(`📊 Total time slots to create: ${timeSlots.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugGenerateSchedule();