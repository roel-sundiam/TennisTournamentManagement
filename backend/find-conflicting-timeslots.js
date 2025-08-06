const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function findConflictingTimeSlots() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check for ANY time slots with the specific court and time that's causing conflicts
    const targetStartTime = new Date('2025-07-26T10:00:00.000Z');
    const targetEndTime = new Date('2025-07-26T11:00:00.000Z');
    
    const db = mongoose.connection.db;
    const conflictingSlots = await db.collection('timeslots').find({ 
      court: "Court 1",
      startTime: targetStartTime,
      endTime: targetEndTime
    }).toArray();
    
    console.log(`🔍 Found ${conflictingSlots.length} time slots with conflicting court/time`);
    
    if (conflictingSlots.length > 0) {
      console.log('\n📋 Conflicting time slots:');
      conflictingSlots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    ID: ${slot._id}`);
        console.log(`    Tournament: ${slot.tournament}`);
        console.log(`    Court: ${slot.court}`);
        console.log(`    Start: ${slot.startTime}`);
        console.log(`    End: ${slot.endTime}`);
        console.log(`    Status: ${slot.status}`);
        console.log('');
      });
      
      console.log('🗑️ Deleting conflicting time slots...');
      const deleteResult = await db.collection('timeslots').deleteMany({ 
        court: "Court 1",
        startTime: targetStartTime,
        endTime: targetEndTime
      });
      console.log(`✅ Deleted ${deleteResult.deletedCount} conflicting time slots`);
    }
    
    // Also check for any overlapping time slots
    console.log('\n🔍 Checking for overlapping time slots...');
    const overlappingSlots = await db.collection('timeslots').find({ 
      court: "Court 1",
      $or: [
        { startTime: { $lte: targetStartTime }, endTime: { $gt: targetStartTime } },
        { startTime: { $lt: targetEndTime }, endTime: { $gte: targetEndTime } },
        { startTime: { $gte: targetStartTime }, endTime: { $lte: targetEndTime } }
      ]
    }).toArray();
    
    console.log(`🔍 Found ${overlappingSlots.length} overlapping time slots`);
    
    if (overlappingSlots.length > 0) {
      console.log('\n📋 Overlapping time slots:');
      overlappingSlots.forEach((slot, index) => {
        console.log(`  Slot ${index + 1}:`);
        console.log(`    ID: ${slot._id}`);
        console.log(`    Tournament: ${slot.tournament}`);
        console.log(`    Court: ${slot.court}`);
        console.log(`    Start: ${slot.startTime}`);
        console.log(`    End: ${slot.endTime}`);
        console.log(`    Status: ${slot.status}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

findConflictingTimeSlots();