const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function clearAllCourt1TimeSlots() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find ALL time slots for Court 1 in the date range July 26-28, 2025
    const db = mongoose.connection.db;
    const startDate = new Date('2025-07-26T00:00:00.000Z');
    const endDate = new Date('2025-07-29T00:00:00.000Z');
    
    const allCourt1Slots = await db.collection('timeslots').find({ 
      court: "Court 1",
      startTime: { $gte: startDate, $lt: endDate }
    }).toArray();
    
    console.log(`🔍 Found ${allCourt1Slots.length} Court 1 time slots in July 26-28, 2025`);
    
    if (allCourt1Slots.length > 0) {
      console.log('\n📋 All Court 1 time slots in date range:');
      allCourt1Slots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    ID: ${slot._id}`);
        console.log(`    Tournament: ${slot.tournament}`);
        console.log(`    Court: ${slot.court}`);
        console.log(`    Start: ${slot.startTime}`);
        console.log(`    End: ${slot.endTime}`);
        console.log(`    Status: ${slot.status}`);
        console.log('');
      });
      
      console.log('🗑️ Deleting ALL Court 1 time slots in date range...');
      const deleteResult = await db.collection('timeslots').deleteMany({ 
        court: "Court 1",
        startTime: { $gte: startDate, $lt: endDate }
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} time slots`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

clearAllCourt1TimeSlots();