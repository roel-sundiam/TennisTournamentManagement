const mongoose = require('mongoose');
require('dotenv').config();

async function fixTimeSlotIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const collection = db.collection('timeslots');
    
    // Check existing indexes
    const indexes = await collection.listIndexes().toArray();
    console.log('📊 Existing indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    // Drop the old problematic index
    try {
      await collection.dropIndex({ court: 1, startTime: 1, endTime: 1 });
      console.log('✅ Dropped old index: court_1_startTime_1_endTime_1');
    } catch (error) {
      console.log('⚠️ Old index not found or already dropped');
    }
    
    // Create the new index
    try {
      await collection.createIndex(
        { tournament: 1, court: 1, startTime: 1, endTime: 1 }, 
        { unique: true, sparse: true }
      );
      console.log('✅ Created new index: tournament_1_court_1_startTime_1_endTime_1');
    } catch (error) {
      console.log('⚠️ New index already exists or creation failed:', error.message);
    }
    
    // Check final indexes
    const finalIndexes = await collection.listIndexes().toArray();
    console.log('📊 Final indexes:');
    finalIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('✅ Index fix completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixTimeSlotIndex();