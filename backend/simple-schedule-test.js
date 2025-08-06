const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;
const TimeSlot = require('./dist/models/TimeSlot').default;
const Schedule = require('./dist/models/Schedule').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function createSimpleSchedule() {
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
    
    console.log('🏆 Tournament found:', tournament.name);
    
    // Clean up existing schedules and time slots
    await Schedule.deleteMany({ tournament: tournamentId });
    await TimeSlot.deleteMany({ tournament: tournamentId });
    console.log('🧹 Cleaned up existing schedules and time slots');
    
    // Create a simple schedule
    const schedule = await Schedule.create({
      tournament: tournamentId,
      name: `${tournament.name} - Manual Schedule`,
      description: 'Simple schedule for testing',
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      courts: tournament.availableCourts,
      timeSlotDuration: 60,
      startTime: '18:00',
      endTime: '22:00',
      breakBetweenMatches: 5,
      totalMatches: 7,
      scheduledMatches: 0,
      conflicts: [],
      estimatedDuration: 7,
      status: 'published',
      generatedAt: new Date(),
      publishedAt: new Date()
    });
    
    console.log('📅 Created schedule record:', schedule._id);
    
    // Create time slots manually
    const timeSlots = [];
    const startDate = new Date('2025-07-26'); // Use a fixed date for testing
    
    // Create 4 time slots per day for 3 days = 12 total slots
    for (let day = 0; day < 3; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      for (let hour = 18; hour < 22; hour++) { // 6 PM to 10 PM
        const slotStart = new Date(currentDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setHours(hour + 1, 0, 0, 0);
        
        timeSlots.push({
          tournament: tournamentId,
          court: 'Court 1',
          startTime: slotStart,
          endTime: slotEnd,
          status: 'available',
          duration: 60,
          notes: 'Court: Court 1'
        });
        
        console.log(`   ⏰ ${slotStart.toLocaleString()} - ${slotEnd.toLocaleString()}`);
      }
    }
    
    console.log(`📊 Creating ${timeSlots.length} time slots...`);
    
    // Insert time slots one by one to avoid duplicate key issues
    let created = 0;
    for (const slot of timeSlots) {
      try {
        await TimeSlot.create(slot);
        created++;
      } catch (error) {
        console.log('❌ Failed to create slot:', error.message);
      }
    }
    
    console.log(`✅ Successfully created ${created} time slots`);
    
    // Verify creation
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    console.log(`📊 Final time slot count: ${timeSlotCount}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createSimpleSchedule();