const mongoose = require('mongoose');
const TimeSlot = require('./dist/models/TimeSlot').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function checkTimeSlots() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879a0eeca3117be4e088335';
    
    // Check existing time slots
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log('📊 Existing time slots for tournament:', timeSlots.length);
    
    if (timeSlots.length > 0) {
      console.log('🔍 Sample time slot:', timeSlots[0]);
    }
    
    // Check for any duplicate or conflicting time slots
    const allTimeSlots = await TimeSlot.find({ tournament: tournamentId }).sort({ startTime: 1 });
    console.log('📋 All time slots:');
    allTimeSlots.forEach((slot, index) => {
      console.log(`  ${index + 1}. ${slot.court} ${new Date(slot.startTime).toLocaleString()} - ${new Date(slot.endTime).toLocaleString()}`);
    });
    
    // Check the schema indexes
    const indexes = await TimeSlot.collection.getIndexes();
    console.log('📝 TimeSlot indexes:', Object.keys(indexes));
    
    // Clean up existing time slots if needed
    console.log('🧹 Cleaning up existing time slots...');
    const deleteResult = await TimeSlot.deleteMany({ tournament: tournamentId });
    console.log(`✅ Deleted ${deleteResult.deletedCount} time slots`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkTimeSlots();