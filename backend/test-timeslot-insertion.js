const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;
const TimeSlot = require('./dist/models/TimeSlot').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function testTimeSlotInsertion() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879b6b5c1470a4ab4f4a416';
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('🏆 Testing Time Slot Insertion');
    
    // Replicate the exact logic from generateTournamentSchedule
    const tournamentStartDate = new Date(tournament.startDate || new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = tournamentStartDate > new Date() ? tournamentStartDate : tomorrow;
    
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    
    const timeSlots = [];
    
    const tournamentEndDate = new Date(tournament.endDate || scheduleDate);
    const tournamentDays = Math.ceil((tournamentEndDate.getTime() - scheduleDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    // Generate time slots for each day of the tournament
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
        
        // Check if slot end time exceeds daily end time
        const slotEndHour = slotEnd.getHours();
        const slotEndMin = slotEnd.getMinutes();
        
        if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
          break;
        }
        
        timeSlots.push({
          tournament: new mongoose.Types.ObjectId(tournament._id),
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
    
    console.log(`🔍 Generated ${timeSlots.length} time slots for insertion`);
    if (timeSlots.length > 0) {
      console.log('🔍 Sample time slot:', JSON.stringify(timeSlots[0], null, 2));
      
      // Clear existing time slots first
      const deleted = await TimeSlot.deleteMany({ tournament: tournamentId });
      console.log(`🗑️ Deleted ${deleted.deletedCount} existing time slots`);
      
      try {
        console.log('🔧 Attempting to insert time slots using Mongoose...');
        const createdSlots = await TimeSlot.insertMany(timeSlots);
        console.log(`⏰ SUCCESS: Created ${createdSlots.length} time slots`);
      } catch (error) {
        console.error('❌ TimeSlot insertMany failed:');
        console.error('Error message:', error.message);
        console.error('Error code:', error.code);
        console.error('Error name:', error.name);
        if (error.errors) {
          console.error('Validation errors:', error.errors);
        }
        
        // Try inserting a single slot to see specific validation error
        console.log('\n🔧 Trying to insert single time slot for detailed error...');
        try {
          const singleSlot = await TimeSlot.create(timeSlots[0]);
          console.log('✅ Single slot creation succeeded:', singleSlot._id);
        } catch (singleError) {
          console.error('❌ Single slot creation failed:');
          console.error('Single error message:', singleError.message);
          if (singleError.errors) {
            console.error('Single validation errors:', singleError.errors);
          }
        }
      }
    } else {
      console.log('⚠️ No time slots generated - check time window configuration');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testTimeSlotInsertion();