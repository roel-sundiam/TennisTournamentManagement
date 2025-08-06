const mongoose = require('mongoose');
require('dotenv').config();

async function debugWinnerAdvancement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match, Team } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== DETAILED MATCH ANALYSIS ===');
    
    // Get matches with populated team data
    const matches = await Match.find({ tournament: tournamentId })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    console.log(`Found ${matches.length} matches`);
    
    matches.forEach((match, i) => {
      console.log(`\n=== Match ${i + 1} (Round ${match.round}) ===`);
      console.log(`  ID: ${match._id}`);
      console.log(`  Team 1: ${match.team1?.name || 'NULL'}`);
      console.log(`  Team 2: ${match.team2?.name || 'NULL'}`);
      console.log(`  Status: ${match.status}`);
      console.log(`  Winner: ${match.winner?.name || 'NULL'}`);
      console.log(`  Winner ID: ${match.winner?._id || 'NULL'}`);
      
      if (match.score) {
        console.log(`  Score: ${JSON.stringify(match.score, null, 2)}`);
      } else {
        console.log(`  Score: NULL`);
      }
      
      // Check if this is a completed match without a winner
      if (match.status === 'completed' && !match.winner) {
        console.log(`  ❌ PROBLEM: Match completed but no winner set!`);
      }
    });
    
    // Check if there are Round 2 matches
    const round2Matches = matches.filter(m => m.round === 2);
    console.log(`\n=== ROUND 2 MATCHES ===`);
    console.log(`Found ${round2Matches.length} Round 2 matches`);
    
    round2Matches.forEach((match, i) => {
      console.log(`\nRound 2 Match ${i + 1}:`);
      console.log(`  Team 1: ${match.team1?.name || 'TBD'}`);
      console.log(`  Team 2: ${match.team2?.name || 'TBD'}`);
      console.log(`  Status: ${match.status}`);
    });
    
    // Check for advancement issues
    const round1Winners = matches.filter(m => m.round === 1 && m.status === 'completed' && m.winner);
    console.log(`\n=== ADVANCEMENT ANALYSIS ===`);
    console.log(`Round 1 completed matches with winners: ${round1Winners.length}`);
    
    if (round1Winners.length > 0) {
      console.log('Round 1 winners:');
      round1Winners.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.winner.name} (from Match ${match.matchNumber})`);
      });
      
      // Check if these winners are in Round 2
      const round2Teams = round2Matches.flatMap(m => [m.team1?.name, m.team2?.name]).filter(Boolean);
      const winnerNames = round1Winners.map(m => m.winner.name);
      
      console.log('\nRound 2 teams:', round2Teams);
      console.log('Should contain:', winnerNames);
      
      const missingWinners = winnerNames.filter(name => !round2Teams.includes(name));
      if (missingWinners.length > 0) {
        console.log(`❌ These winners didn't advance: ${missingWinners.join(', ')}`);
      } else {
        console.log('✅ All winners properly advanced to Round 2');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugWinnerAdvancement();