const mongoose = require('mongoose');
require('dotenv').config();

async function scheduleMatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Match = require('./dist/models/Match').default;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n⏰ SIMPLE MATCH SCHEDULING');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get Round 1 matches
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1
    }).sort({ matchNumber: 1 });
    
    console.log(`Found ${round1Matches.length} Round 1 matches`);
    
    if (round1Matches.length === 0) {
      console.log('❌ No Round 1 matches found');
      return;
    }
    
    // Create schedule times for tomorrow starting at 6 PM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Schedule times: 6 PM, 7 PM, 8 PM, 9 PM (1 hour apart)
    const scheduleTimes = [
      { hour: 18, minute: 0 }, // 6:00 PM
      { hour: 19, minute: 0 }, // 7:00 PM  
      { hour: 20, minute: 0 }, // 8:00 PM
      { hour: 21, minute: 0 }  // 9:00 PM
    ];
    
    console.log('\n📅 Assigning match times...');
    
    for (let i = 0; i < Math.min(round1Matches.length, scheduleTimes.length); i++) {
      const match = round1Matches[i];
      const timeSlot = scheduleTimes[i];
      
      const matchTime = new Date(tomorrow);
      matchTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      
      await Match.updateOne(
        { _id: match._id },
        { 
          scheduledDateTime: matchTime,
          status: 'scheduled'
        }
      );
      
      const timeDisplay = matchTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`✅ Match ${match.matchNumber}: ${timeDisplay}`);
    }
    
    console.log('\n🎯 SIMPLE SCHEDULING COMPLETE!');
    console.log('Matches now have scheduled times and should appear in the schedule view.');
    console.log('Go to /tournaments/6878d6d4dfdf2780f694db4a/manage#schedule to see them.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

scheduleMatches();