const mongoose = require('mongoose');
require('dotenv').config();

async function findMatchIssue() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Team, Match, Tournament } = require('./dist/models/index');
    
    console.log('\n=== FINDING THE PROBLEMATIC MATCH ===');
    
    // Find the specific teams
    const dirkLarryTeam = await Team.findOne({
      $or: [
        { name: /Dirk.*Larry/i },
        { name: /Larry.*Dirk/i }
      ]
    });
    
    const rafaelDanTeam = await Team.findOne({
      $or: [
        { name: /Rafael.*Dan/i },
        { name: /Dan.*Rafael/i }
      ]
    });
    
    if (!dirkLarryTeam || !rafaelDanTeam) {
      console.log('Teams not found!');
      return;
    }
    
    console.log(`Dirk/Larry Team: ${dirkLarryTeam.name} (ID: ${dirkLarryTeam._id})`);
    console.log(`Rafael/Dan Team: ${rafaelDanTeam.name} (ID: ${rafaelDanTeam._id})`);
    
    // Find matches involving these teams by team ID
    const matchesWithDirkLarry = await Match.find({
      $or: [
        { 'team1._id': dirkLarryTeam._id },
        { 'team2._id': dirkLarryTeam._id }
      ]
    });
    
    const matchesWithRafaelDan = await Match.find({
      $or: [
        { 'team1._id': rafaelDanTeam._id },
        { 'team2._id': rafaelDanTeam._id }
      ]
    });
    
    console.log(`\nMatches with Dirk/Larry: ${matchesWithDirkLarry.length}`);
    matchesWithDirkLarry.forEach(match => {
      console.log(`  Match ${match.matchNumber} (Round ${match.round}): ${match.team1?.name} vs ${match.team2?.name}`);
      console.log(`    Tournament: ${match.tournamentId}`);
      console.log(`    Status: ${match.status} | Winner: ${match.winner?.name || 'No winner'}`);
    });
    
    console.log(`\nMatches with Rafael/Dan: ${matchesWithRafaelDan.length}`);
    matchesWithRafaelDan.forEach(match => {
      console.log(`  Match ${match.matchNumber} (Round ${match.round}): ${match.team1?.name} vs ${match.team2?.name}`);
      console.log(`    Tournament: ${match.tournamentId}`);
      console.log(`    Status: ${match.status} | Winner: ${match.winner?.name || 'No winner'}`);
    });
    
    // Find the match between these two teams
    const directMatch = await Match.findOne({
      $or: [
        { 'team1._id': dirkLarryTeam._id, 'team2._id': rafaelDanTeam._id },
        { 'team1._id': rafaelDanTeam._id, 'team2._id': dirkLarryTeam._id }
      ]
    });
    
    if (directMatch) {
      console.log(`\n*** FOUND THE DIRECT MATCH ***`);
      console.log(`Match ${directMatch.matchNumber} (Round ${directMatch.round})`);
      console.log(`${directMatch.team1?.name} vs ${directMatch.team2?.name}`);
      console.log(`Tournament: ${directMatch.tournamentId}`);
      console.log(`Status: ${directMatch.status}`);
      console.log(`Winner: ${directMatch.winner?.name || 'No winner'}`);
      console.log(`Winner ID: ${directMatch.winner?._id}`);
      
      if (directMatch.score) {
        console.log(`Score: ${JSON.stringify(directMatch.score, null, 2)}`);
      }
      
      // Now check if the winner appears in next round matches
      if (directMatch.winner && directMatch.tournamentId) {
        console.log(`\n=== CHECKING WINNER ADVANCEMENT ===`);
        const nextRoundMatches = await Match.find({
          tournamentId: directMatch.tournamentId,
          round: directMatch.round + 1
        });
        
        console.log(`Next round (Round ${directMatch.round + 1}) matches:`);
        nextRoundMatches.forEach(match => {
          console.log(`  Match ${match.matchNumber}: ${match.team1?.name || 'TBD'} vs ${match.team2?.name || 'TBD'}`);
          
          // Check if winner is in this match
          const winnerInMatch = (match.team1?._id?.toString() === directMatch.winner._id?.toString()) ||
                               (match.team2?._id?.toString() === directMatch.winner._id?.toString());
          
          if (winnerInMatch) {
            console.log(`    ✅ WINNER FOUND IN THIS MATCH`);
          }
        });
        
        // Check if winner appears anywhere in next round
        const winnerInNextRound = nextRoundMatches.some(match => 
          (match.team1?._id?.toString() === directMatch.winner._id?.toString()) ||
          (match.team2?._id?.toString() === directMatch.winner._id?.toString())
        );
        
        if (!winnerInNextRound) {
          console.log(`❌ PROBLEM: Winner ${directMatch.winner.name} did NOT advance to Round ${directMatch.round + 1}`);
        } else {
          console.log(`✅ Winner ${directMatch.winner.name} properly advanced to Round ${directMatch.round + 1}`);
        }
      }
      
    } else {
      console.log('\nNo direct match found between these teams');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

findMatchIssue();