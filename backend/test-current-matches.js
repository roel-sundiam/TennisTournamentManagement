const mongoose = require('mongoose');
require('dotenv').config();

async function testCurrentMatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    const matches = await Match.find({ tournament: tournamentId }).sort({ round: 1, matchNumber: 1 });
    
    console.log('\n=== TESTING TIMEZONE DISPLAY ===');
    
    matches.forEach((match, i) => {
      const utcTime = match.scheduledDateTime;
      const jsDate = new Date(utcTime);
      
      console.log(`\nMatch ${i + 1}:`);
      console.log(`  Raw UTC from DB: ${utcTime.toISOString()}`);
      console.log(`  JavaScript Date: ${jsDate.toString()}`);
      
      // Test different timezone conversions
      const manila = jsDate.toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const utcDisplay = jsDate.toLocaleString('en-US', { timeZone: 'UTC' });
      
      console.log(`  Manila display: ${manila}`);
      console.log(`  UTC display: ${utcDisplay}`);
      
      // Test the exact format we use in frontend
      const frontendFormat = jsDate.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  Frontend format: ${frontendFormat}`);
    });
    
    console.log('\n=== EXPECTED vs ACTUAL ===');
    console.log('Expected: Should show times around 7 PM, 8 PM, 9 PM');
    console.log('If still showing 10 AM, 11 AM - frontend code not updated');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testCurrentMatches();