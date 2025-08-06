const mongoose = require('mongoose');
require('dotenv').config();

async function advanceWinners() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== ADVANCING ROUND 1 WINNERS TO ROUND 2 ===');
    
    // Get Round 1 completed matches with winners
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1, 
      status: 'completed',
      winner: { $ne: null }
    }).sort({ matchNumber: 1 });
    
    // Get Round 2 matches
    const round2Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 2 
    }).sort({ matchNumber: 1 });
    
    console.log(`Found ${round1Matches.length} Round 1 winners`);
    console.log(`Found ${round2Matches.length} Round 2 matches`);
    
    if (round1Matches.length !== 4 || round2Matches.length !== 2) {
      console.log('❌ Unexpected match structure!');
      return;
    }
    
    // Standard single elimination advancement:
    // Round 1 Match 1 winner vs Round 1 Match 4 winner → Round 2 Match 1
    // Round 1 Match 2 winner vs Round 1 Match 3 winner → Round 2 Match 2
    
    const advancement = [
      {
        round2Match: round2Matches[0], // Round 2 Match 1
        team1: round1Matches[0].winner, // Round 1 Match 1 winner
        team2: round1Matches[3].winner  // Round 1 Match 4 winner
      },
      {
        round2Match: round2Matches[1], // Round 2 Match 2  
        team1: round1Matches[1].winner, // Round 1 Match 2 winner
        team2: round1Matches[2].winner  // Round 1 Match 3 winner
      }
    ];
    
    console.log('\nAdvancement plan:');
    
    for (let i = 0; i < advancement.length; i++) {
      const { round2Match, team1, team2 } = advancement[i];
      
      // Get team names for logging
      const team1Doc = await mongoose.model('Team').findById(team1).populate('players', 'name');
      const team2Doc = await mongoose.model('Team').findById(team2).populate('players', 'name');
      
      console.log(`\nRound 2 Match ${i + 1}:`);
      console.log(`  Team 1: ${team1Doc.name} (${team1})`);
      console.log(`  Team 2: ${team2Doc.name} (${team2})`);
      
      // Update the Round 2 match with the teams
      await Match.updateOne(
        { _id: round2Match._id },
        { 
          team1: team1,
          team2: team2
        }
      );
      
      console.log(`✅ Updated Round 2 Match ${i + 1}`);
    }
    
    console.log('\n🎯 WINNER ADVANCEMENT COMPLETE!');
    console.log('Round 1 winners have been advanced to Round 2 semifinals.');
    
    // Verify the advancement
    console.log('\n=== VERIFICATION ===');
    const updatedRound2 = await Match.find({ tournament: tournamentId, round: 2 })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .sort({ matchNumber: 1 });
    
    updatedRound2.forEach((match, i) => {
      console.log(`Round 2 Match ${i + 1}:`);
      console.log(`  Team 1: ${match.team1?.name || 'NULL'}`);
      console.log(`  Team 2: ${match.team2?.name || 'NULL'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

advanceWinners();