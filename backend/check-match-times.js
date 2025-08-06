const mongoose = require('mongoose');
require('dotenv').config();

async function checkMatchTimes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== LATEST MATCH TIMES ===');
    const matches = await Match.find({ tournament: tournamentId })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    matches.forEach((match, i) => {
      const localTime = match.scheduledDateTime ? new Date(match.scheduledDateTime) : null;
      
      console.log(`\nMatch ${i + 1} (Round ${match.round}):`);
      console.log(`  Teams: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
      console.log(`  Status: ${match.status}`);
      
      if (localTime) {
        console.log(`  Scheduled Time (UTC): ${match.scheduledDateTime.toISOString()}`);
        console.log(`  Local Time (PHT): ${localTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
        console.log(`  Time only: ${localTime.toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}`);
      } else {
        console.log(`  Scheduled Time: Not scheduled`);
      }
      console.log(`  Court: ${match.court || 'Not assigned'}`);
    });
    
    // Check if times are in evening range (6-10 PM local)
    console.log('\n=== TIME ANALYSIS ===');
    const eveningMatches = matches.filter(match => {
      if (!match.scheduledDateTime) return false;
      const localTime = new Date(match.scheduledDateTime);
      const localHour = localTime.getHours() + 8; // Add 8 hours for PHT
      const adjustedHour = localHour >= 24 ? localHour - 24 : localHour;
      return adjustedHour >= 18 && adjustedHour <= 22; // 6 PM to 10 PM
    });
    
    console.log(`Matches scheduled in evening (6-10 PM): ${eveningMatches.length}/${matches.length}`);
    
    if (eveningMatches.length === 0) {
      console.log('❌ NO MATCHES in evening time range - timezone fix may need adjustment');
      
      // Show what times we actually got
      console.log('\nActual scheduled hours (local):');
      matches.forEach((match, i) => {
        if (match.scheduledDateTime) {
          const utcTime = new Date(match.scheduledDateTime);
          const localHour = utcTime.getUTCHours() + 8; // Convert UTC to PHT
          const adjustedHour = localHour >= 24 ? localHour - 24 : localHour;
          console.log(`  Match ${i + 1}: ${adjustedHour}:00 PHT`);
        }
      });
    } else {
      console.log('✅ Matches correctly scheduled in evening range');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMatchTimes();