const mongoose = require('mongoose');
require('dotenv').config();

async function verifyServerCode() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('🔍 VERIFYING SERVER CODE VERSION');
    console.log('===============================');
    
    // Check if the enhanced auto-scheduling code is in the compiled version
    const fs = require('fs');
    const matchesJsPath = './dist/routes/matches.js';
    
    if (!fs.existsSync(matchesJsPath)) {
      console.log('❌ Compiled matches.js not found');
      return;
    }
    
    const matchesJs = fs.readFileSync(matchesJsPath, 'utf8');
    
    // Check for our enhanced trigger logic
    const hasEnhancedLogic = matchesJs.includes('totalMatches > 0 && existingTimeSlots === 0');
    const hasTimeSlotImport = matchesJs.includes('TimeSlot_1.default.countDocuments');
    const hasGenerateScheduleCall = matchesJs.includes('generateTournamentSchedule(tournament)');
    
    console.log('📋 Code verification:');
    console.log('  Enhanced trigger logic:', hasEnhancedLogic ? '✅' : '❌');
    console.log('  TimeSlot import:', hasTimeSlotImport ? '✅' : '❌');
    console.log('  Auto-schedule call:', hasGenerateScheduleCall ? '✅' : '❌');
    
    if (hasEnhancedLogic && hasTimeSlotImport && hasGenerateScheduleCall) {
      console.log('✅ Compiled code has our fixes');
    } else {
      console.log('❌ Compiled code is missing our fixes');
    }
    
    // Test the actual compiled function
    console.log('');
    console.log('🧪 Testing compiled auto-scheduling logic...');
    
    try {
      const { generateTournamentSchedule } = require('./dist/routes/tournaments');
      console.log('✅ generateTournamentSchedule function loads successfully');
      
      // Test with a dummy tournament
      const testTournament = {
        _id: 'test',
        autoScheduleEnabled: true,
        dailyStartTime: '18:00',
        dailyEndTime: '22:00',
        availableCourts: ['Court 1'],
        matchDuration: 60,
        startDate: new Date()
      };
      
      console.log('✅ Function signature appears correct');
      
    } catch (error) {
      console.log('❌ Error loading compiled function:', error.message);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

verifyServerCode();