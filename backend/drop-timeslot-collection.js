const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function dropTimeSlotCollection() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the timeslots collection entirely
    try {
      await mongoose.connection.db.collection('timeslots').drop();
      console.log('🗑️ Dropped timeslots collection');
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('⚠️ Timeslots collection already does not exist');
      } else {
        throw error;
      }
    }
    
    console.log('✅ Collection dropped - new schema will be used on next creation');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

dropTimeSlotCollection();