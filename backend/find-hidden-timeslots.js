const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function findHiddenTimeSlots() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879b6b5c1470a4ab4f4a416';
    
    // Check using direct MongoDB query to see ALL time slots
    const db = mongoose.connection.db;
    const timeSlots = await db.collection('timeslots').find({ tournament: tournamentId }).toArray();
    
    console.log(`🔍 Found ${timeSlots.length} time slots via direct MongoDB query`);
    
    if (timeSlots.length > 0) {
      console.log('\n📋 Existing time slots:');
      timeSlots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    ID: ${slot._id}`);
        console.log(`    Tournament: ${slot.tournament}`);
        console.log(`    Court: ${slot.court}`);
        console.log(`    Start: ${slot.startTime}`);
        console.log(`    End: ${slot.endTime}`);
        console.log(`    Status: ${slot.status}`);
        console.log('');
      });
      
      // Try to delete them
      console.log('🗑️ Attempting to delete existing time slots...');
      const deleteResult = await db.collection('timeslots').deleteMany({ tournament: tournamentId });
      console.log(`✅ Deleted ${deleteResult.deletedCount} time slots`);
    }
    
    // Also check with Mongoose model
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const mongooseSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log(`\n🔍 Found ${mongooseSlots.length} time slots via Mongoose model`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

findHiddenTimeSlots();