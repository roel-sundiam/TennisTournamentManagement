const mongoose = require('mongoose');
require('dotenv').config();

async function testBracketLogic() {
  console.log('🧪 TESTING BRACKET ADVANCEMENT LOGIC');
  
  // Test the current advancement logic
  console.log('\n📊 Current Logic Test:');
  console.log('For 8 teams in single elimination:');
  console.log('Round 1: 4 matches (1,2,3,4)');
  console.log('Round 2: 2 matches (1,2)');
  console.log('Round 3: 1 match (1)');
  
  console.log('\n🔍 Testing Round 1 → Round 2 advancement:');
  
  // Test each Round 1 match
  const round1Matches = [
    { round: 1, matchNumber: 1, name: 'Team A vs Team B' },
    { round: 1, matchNumber: 2, name: 'Team C vs Team D' },
    { round: 1, matchNumber: 3, name: 'Team E vs Team F' },
    { round: 1, matchNumber: 4, name: 'Team G vs Team H' }
  ];
  
  round1Matches.forEach(match => {
    const nextRound = match.round + 1;
    const nextMatchNumber = Math.ceil(match.matchNumber / 2);
    
    // Current logic from the code
    let isTeam1Slot;
    if (match.round === 1) {
      if (nextMatchNumber === 1) {
        // Semifinal 1: Match 1 winner vs Match 4 winner
        isTeam1Slot = (match.matchNumber === 1);
      } else {
        // Semifinal 2: Match 2 winner vs Match 3 winner  
        isTeam1Slot = (match.matchNumber === 2);
      }
    }
    
    console.log(`  ${match.name} (Match ${match.matchNumber}) →`, {
      nextRound,
      nextMatchNumber,
      slot: isTeam1Slot ? 'team1' : 'team2',
      result: `Round ${nextRound} Match ${nextMatchNumber} ${isTeam1Slot ? 'team1' : 'team2'}`
    });
  });
  
  console.log('\n❌ PROBLEM IDENTIFIED:');
  console.log('Match 3 and Match 4 both try to go to Round 2 Match 2!');
  console.log('Match 3 → Round 2 Match 2 team2 (because matchNumber 3 ≠ 2)');  
  console.log('Match 4 → Round 2 Match 2 team1 (because matchNumber 4 = 1 in semifinal 1)');
  console.log('This is incorrect bracket structure!');
  
  console.log('\n✅ CORRECT BRACKET STRUCTURE:');
  console.log('Round 1 Match 1 winner → Round 2 Match 1 team1');
  console.log('Round 1 Match 2 winner → Round 2 Match 1 team2');
  console.log('Round 1 Match 3 winner → Round 2 Match 2 team1');
  console.log('Round 1 Match 4 winner → Round 2 Match 2 team2');
  
  console.log('\n🔧 CORRECTED LOGIC:');
  
  round1Matches.forEach(match => {
    const nextRound = match.round + 1;
    const nextMatchNumber = Math.ceil(match.matchNumber / 2);
    
    // Corrected logic
    let isTeam1Slot;
    if (match.round === 1) {
      // Standard tournament bracket logic: odd match numbers go to team1, even to team2
      isTeam1Slot = (match.matchNumber % 2 === 1);
    } else {
      // For other rounds, use standard logic
      isTeam1Slot = match.matchNumber % 2 === 1;
    }
    
    console.log(`  ${match.name} (Match ${match.matchNumber}) →`, {
      nextRound,
      nextMatchNumber,
      slot: isTeam1Slot ? 'team1' : 'team2',
      result: `Round ${nextRound} Match ${nextMatchNumber} ${isTeam1Slot ? 'team1' : 'team2'}`
    });
  });
  
  console.log('\n🎯 VERIFICATION:');
  console.log('Round 2 Match 1: Match 1 winner (team1) vs Match 2 winner (team2)');
  console.log('Round 2 Match 2: Match 3 winner (team1) vs Match 4 winner (team2)');
  console.log('✅ This is correct!');
  
  console.log('\n💡 SOLUTION:');
  console.log('The advancement logic should use simple modulo for all rounds:');
  console.log('isTeam1Slot = (completedMatch.matchNumber % 2 === 1)');
}

testBracketLogic();