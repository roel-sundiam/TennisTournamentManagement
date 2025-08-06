const mongoose = require('mongoose');
require('dotenv').config();

async function debugBracketAdvancement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🏆 DEBUGGING BRACKET ADVANCEMENT');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get all matches ordered by round
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId)
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
    console.log(`\n⚔️ Found ${matches.length} matches total`);
    
    // Analyze each round
    const roundGroups = {};
    matches.forEach(match => {
      if (!roundGroups[match.round]) {
        roundGroups[match.round] = [];
      }
      roundGroups[match.round].push(match);
    });
    
    // Get team details
    const teams = await db.collection('teams').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team._id.toString()] = team.name;
    });
    
    console.log('\n📊 ROUND-BY-ROUND ANALYSIS:');
    
    Object.keys(roundGroups).sort().forEach(round => {
      console.log(`\n🏆 === ROUND ${round} ===`);
      const roundMatches = roundGroups[round];
      
      roundMatches.forEach(match => {
        const team1Name = teamMap[match.team1?.toString()] || 'TBD';
        const team2Name = teamMap[match.team2?.toString()] || 'TBD';
        const winnerName = match.winner ? teamMap[match.winner.toString()] || 'Unknown' : 'No winner';
        
        console.log(`\n  Match ${match.matchNumber}: ${team1Name} vs ${team2Name}`);
        console.log(`    Status: ${match.status}`);
        console.log(`    Winner: ${winnerName}`);
        console.log(`    Score: ${match.score?.tennisScore ? `${match.score.tennisScore.team1Games}-${match.score.tennisScore.team2Games}` : 'No score'}`);
        console.log(`    Match ID: ${match._id}`);
        console.log(`    Winner ID: ${match.winner || 'None'}`);
        
        if (match.winner) {
          console.log(`    ✅ Winner determined: ${winnerName}`);
        } else {
          console.log(`    ❌ No winner set`);
        }
      });
    });
    
    console.log('\n🔍 CHECKING WINNER ADVANCEMENT:');
    
    // Check Round 1 winners and their advancement
    const round1Matches = roundGroups['1'] || [];
    const round2Matches = roundGroups['2'] || [];
    
    console.log('\n📋 Round 1 Winners:');
    round1Matches.forEach(match => {
      const winnerName = match.winner ? teamMap[match.winner.toString()] || 'Unknown' : 'No winner';
      console.log(`  Match ${match.matchNumber}: ${winnerName} (Winner ID: ${match.winner || 'None'})`);
    });
    
    console.log('\n📋 Round 2 Match Setup:');
    round2Matches.forEach(match => {
      const team1Name = teamMap[match.team1?.toString()] || 'TBD';
      const team2Name = teamMap[match.team2?.toString()] || 'TBD';
      console.log(`  Match ${match.matchNumber}: ${team1Name} vs ${team2Name}`);
      console.log(`    Team1 ID: ${match.team1 || 'None'}`);
      console.log(`    Team2 ID: ${match.team2 || 'None'}`);
    });
    
    // Focus on Harvey David/Jad Garbes
    console.log('\n🔍 FOCUSING ON HARVEY DAVID/JAD GARBES:');
    
    const harveyTeam = teams.find(team => team.name.includes('Harvey David'));
    if (harveyTeam) {
      console.log(`  Team: ${harveyTeam.name}`);
      console.log(`  Team ID: ${harveyTeam._id}`);
      console.log(`  Seed: ${harveyTeam.seed}`);
      
      // Find their Round 1 match
      const harveyRound1Match = round1Matches.find(match => 
        match.team1?.toString() === harveyTeam._id.toString() || 
        match.team2?.toString() === harveyTeam._id.toString()
      );
      
      if (harveyRound1Match) {
        console.log(`\n  📋 Round 1 Match Details:`);
        console.log(`    Match ID: ${harveyRound1Match._id}`);
        console.log(`    Match Number: ${harveyRound1Match.matchNumber}`);
        console.log(`    Team1: ${teamMap[harveyRound1Match.team1?.toString()]}`);
        console.log(`    Team2: ${teamMap[harveyRound1Match.team2?.toString()]}`);
        console.log(`    Winner: ${harveyRound1Match.winner ? teamMap[harveyRound1Match.winner.toString()] : 'None'}`);
        console.log(`    Winner ID: ${harveyRound1Match.winner || 'None'}`);
        console.log(`    Status: ${harveyRound1Match.status}`);
        
        if (harveyRound1Match.winner && harveyRound1Match.winner.toString() === harveyTeam._id.toString()) {
          console.log(`    ✅ Harvey's team WON this match`);
          
          // Check if they advanced to Round 2
          const harveyRound2Match = round2Matches.find(match => 
            match.team1?.toString() === harveyTeam._id.toString() || 
            match.team2?.toString() === harveyTeam._id.toString()
          );
          
          if (harveyRound2Match) {
            console.log(`    ✅ Found in Round 2: Match ${harveyRound2Match.matchNumber}`);
          } else {
            console.log(`    ❌ NOT FOUND in Round 2 - ADVANCEMENT PROBLEM!`);
            
            // Check what's wrong with Round 2 setup
            console.log(`\n  🔍 Round 2 Investigation:`);
            round2Matches.forEach(match => {
              console.log(`    Match ${match.matchNumber}: ${match.team1 || 'null'} vs ${match.team2 || 'null'}`);
            });
          }
        } else {
          console.log(`    ❌ Harvey's team did NOT win this match`);
        }
      } else {
        console.log(`    ❌ Harvey's team not found in Round 1 matches`);
      }
    } else {
      console.log(`    ❌ Harvey's team not found in teams collection`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugBracketAdvancement();