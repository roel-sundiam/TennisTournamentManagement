const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function testScheduleEndpoint() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879a0eeca3117be4e088335';
    
    // Call the actual API endpoint
    const response = await fetch('http://localhost:3000/api/tournaments/6879a0eeca3117be4e088335/generate-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const result = await response.json();
    console.log('📝 API Response:', result);
    
    // Check the actual state after the call
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const Match = require('./dist/models/Match').default;
    
    const timeSlotCount = await TimeSlot.countDocuments({ tournament: tournamentId });
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDate: { $exists: true }
    });
    
    console.log('📊 Actual state after API call:', {
      timeSlots: timeSlotCount,
      scheduledMatches: scheduledMatches
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testScheduleEndpoint();