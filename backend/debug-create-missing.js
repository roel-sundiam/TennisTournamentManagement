const mongoose = require('mongoose');
require('dotenv').config();

async function debugCreateMissing() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔍 DEBUGGING CREATE-MISSING LOGIC');
    console.log('==================================');
    
    const tournamentId = '68798b50af6f0ed677e07411';
    
    // Simulate the create-missing route logic
    console.log('1. Getting bracket...');
    const bracket = await mongoose.connection.db.collection('brackets').findOne({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    if (!bracket) {
      console.log('❌ Bracket not found');
      return;
    }
    console.log('✅ Bracket found:', bracket.name);
    
    console.log('2. Getting existing matches...');
    const existingMatches = await mongoose.connection.db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const existingMatchKeys = new Set(existingMatches.map(m => `${m.round}-${m.matchNumber}`));
    console.log('📊 Existing matches:', existingMatchKeys.size);
    console.log('   Match keys:', Array.from(existingMatchKeys));
    
    console.log('3. Getting tournament...');
    const tournament = await mongoose.connection.db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    console.log('✅ Tournament found:', tournament.name);
    console.log('📊 Auto-scheduling enabled:', tournament.autoScheduleEnabled);
    
    console.log('4. Simulating bracket processing...');
    let createdMatches = [];
    
    if (bracket.bracketData && bracket.bracketData.rounds) {
      console.log('📋 Bracket has', bracket.bracketData.rounds.length, 'rounds');
      
      for (const round of bracket.bracketData.rounds) {
        console.log(`   Round ${round.roundNumber}: ${round.matches.length} matches`);
        
        for (const match of round.matches) {
          const matchKey = `${match.roundNumber}-${match.matchNumber}`;
          
          if (existingMatchKeys.has(matchKey)) {
            console.log(`   ⏭️ Skipping existing match: ${matchKey}`);
          } else {
            console.log(`   ➕ Would create missing match: ${matchKey}`);
            createdMatches.push(match);
          }
        }
      }
    }
    
    console.log('5. Auto-scheduling check...');
    console.log('   Tournament exists:', !!tournament);
    console.log('   Auto-scheduling enabled:', tournament?.autoScheduleEnabled);
    console.log('   Created matches count:', createdMatches.length);
    console.log('   Would trigger auto-scheduling:', !!(tournament && tournament.autoScheduleEnabled && createdMatches.length > 0));
    
    if (tournament && tournament.autoScheduleEnabled && createdMatches.length > 0) {
      console.log('🗓️ AUTO-SCHEDULING WOULD BE TRIGGERED');
    } else {
      console.log('❌ AUTO-SCHEDULING WOULD NOT BE TRIGGERED');
      if (!tournament) console.log('   Reason: Tournament not found');
      if (!tournament?.autoScheduleEnabled) console.log('   Reason: Auto-scheduling disabled');
      if (createdMatches.length === 0) console.log('   Reason: No new matches created (all already exist)');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
  }
}

debugCreateMissing();