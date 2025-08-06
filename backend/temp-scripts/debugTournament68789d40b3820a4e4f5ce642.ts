import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered
import '../models';

// Load environment variables
dotenv.config();

const TOURNAMENT_ID = '68789d40b3820a4e4f5ce642';

async function debugTournament() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Get models after connection
    const Match = mongoose.model('Match');
    const Tournament = mongoose.model('Tournament');
    const Team = mongoose.model('Team');
    const Bracket = mongoose.model('Bracket');
    
    console.log(`🔍 Debugging tournament: ${TOURNAMENT_ID}`);
    console.log('===================================================');

    // 1. Get tournament details
    const tournament = await Tournament.findById(TOURNAMENT_ID);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    console.log(`🏆 Tournament: ${tournament.name}`);
    console.log(`📅 Created: ${tournament.createdAt}`);
    console.log(`🏃 Max Players: ${tournament.maxPlayers}`);
    console.log(`🎮 Game Format: ${tournament.gameFormat}`);
    console.log(`⚡ Status: ${tournament.status}`);
    console.log('');

    // 2. Get all teams for this tournament
    const teams = await Team.find({ tournament: TOURNAMENT_ID, isActive: true })
      .populate('players', 'firstName lastName ranking')
      .sort({ seed: 1 });
    
    console.log(`👥 Teams (${teams.length}):`);
    teams.forEach((team, index) => {
      console.log(`  ${index + 1}. ${team.name} (Seed: ${team.seed})`);
      if (team.players && team.players.length > 0) {
        team.players.forEach((player: any) => {
          console.log(`     - ${player.firstName} ${player.lastName} (Ranking: ${player.ranking})`);
        });
      }
    });
    console.log('');

    // 3. Get bracket information
    const bracket = await Bracket.findOne({ tournament: TOURNAMENT_ID })
      .populate('teams', 'name seed');
    
    console.log(`🎯 Bracket Information:`);
    if (bracket) {
      console.log(`  - Bracket ID: ${bracket._id}`);
      console.log(`  - Format: ${bracket.format}`);
      console.log(`  - Total Teams: ${bracket.totalTeams}`);
      console.log(`  - Total Rounds: ${bracket.totalRounds}`);
      console.log(`  - Status: ${bracket.status}`);
      console.log(`  - Teams in Bracket: ${bracket.teams?.length || 0}`);
      
      if (bracket.bracketData && bracket.bracketData.rounds) {
        console.log(`  - Bracket Rounds: ${bracket.bracketData.rounds.length}`);
        bracket.bracketData.rounds.forEach((round: any, index: number) => {
          console.log(`    Round ${round.roundNumber}: ${round.matches.length} matches`);
        });
      }
    } else {
      console.log('  - No bracket found for this tournament');
    }
    console.log('');

    // 4. Get all matches for this tournament
    const matches = await Match.find({ tournament: TOURNAMENT_ID })
      .populate('team1', 'name players seed')
      .populate('team2', 'name players seed')
      .populate('winner', 'name players seed')
      .sort({ round: 1, matchNumber: 1 });

    console.log(`⚔️ All Matches (${matches.length}):`);
    matches.forEach((match, index) => {
      console.log(`  ${index + 1}. Round ${match.round}, Match ${match.matchNumber}`);
      console.log(`     Status: ${match.status}`);
      console.log(`     Team 1: ${(match.team1 as any)?.name || 'TBD'}`);
      console.log(`     Team 2: ${(match.team2 as any)?.name || 'TBD'}`);
      console.log(`     Winner: ${(match.winner as any)?.name || 'None'}`);
      console.log(`     Match ID: ${match._id}`);
      if (match.status === 'completed') {
        console.log(`     Final Score: ${match.score?.tennisScore?.team1Sets}-${match.score?.tennisScore?.team2Sets}`);
      }
      console.log('');
    });

    // 5. Analyze the specific bracket advancement issue
    console.log('🔍 BRACKET ADVANCEMENT ANALYSIS:');
    console.log('=====================================');
    
    // For 10-team tournament, we should have:
    // Round 1: 8 matches (10 teams → 8 bye spots + 2 first round matches)
    // Round 2: 4 matches (quarterfinals)
    // Round 3: 2 matches (semifinals)
    // Round 4: 1 match (final)
    
    const matchesByRound = matches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as { [key: number]: any[] });

    Object.keys(matchesByRound).forEach(round => {
      const roundNum = parseInt(round);
      const roundMatches = matchesByRound[roundNum];
      console.log(`Round ${roundNum}: ${roundMatches.length} matches`);
      
      roundMatches.forEach((match, index) => {
        console.log(`  Match ${match.matchNumber}: ${match.status}`);
        console.log(`    Team 1: ${(match.team1 as any)?.name || 'TBD'}`);
        console.log(`    Team 2: ${(match.team2 as any)?.name || 'TBD'}`);
        console.log(`    Winner: ${(match.winner as any)?.name || 'None'}`);
      });
      console.log('');
    });

    // 6. Focus on the specific issue: Match 3 winner not advancing
    console.log('🎯 SPECIFIC ISSUE ANALYSIS:');
    console.log('============================');
    
    // Find Match 3 (assuming it's in an early round)
    const match3 = matches.find(m => m.matchNumber === 3);
    if (match3) {
      console.log(`📍 Match 3 Details:`);
      console.log(`  - Round: ${match3.round}`);
      console.log(`  - Status: ${match3.status}`);
      console.log(`  - Team 1: ${(match3.team1 as any)?.name || 'TBD'}`);
      console.log(`  - Team 2: ${(match3.team2 as any)?.name || 'TBD'}`);
      console.log(`  - Winner: ${(match3.winner as any)?.name || 'None'}`);
      console.log(`  - Match ID: ${match3._id}`);
      
      if (match3.status === 'completed' && match3.winner) {
        console.log(`  - ✅ Match 3 is completed with winner: ${(match3.winner as any).name}`);
        
        // Check where this winner should advance to
        const nextRound = match3.round + 1;
        const nextMatchNumber = Math.ceil(match3.matchNumber / 2);
        
        console.log(`  - 📈 Winner should advance to Round ${nextRound}, Match ${nextMatchNumber}`);
        
        // Find the next match
        const nextMatch = matches.find(m => m.round === nextRound && m.matchNumber === nextMatchNumber);
        if (nextMatch) {
          console.log(`  - 🎯 Next match found:`);
          console.log(`    - Status: ${nextMatch.status}`);
          console.log(`    - Team 1: ${(nextMatch.team1 as any)?.name || 'TBD'}`);
          console.log(`    - Team 2: ${(nextMatch.team2 as any)?.name || 'TBD'}`);
          console.log(`    - Match ID: ${nextMatch._id}`);
          
          // Check if the winner was properly advanced
          const winnerInNextMatch = (nextMatch.team1 as any)?._id?.toString() === (match3.winner as any)?._id?.toString() ||
                                   (nextMatch.team2 as any)?._id?.toString() === (match3.winner as any)?._id?.toString();
          
          if (winnerInNextMatch) {
            console.log(`  - ✅ Winner was properly advanced to next match`);
          } else {
            console.log(`  - ❌ Winner was NOT advanced to next match`);
            console.log(`  - 🔧 ISSUE IDENTIFIED: Bracket advancement failed`);
          }
        } else {
          console.log(`  - ❌ Next match not found (Round ${nextRound}, Match ${nextMatchNumber})`);
          console.log(`  - 🔧 ISSUE IDENTIFIED: Missing next round match`);
        }
      } else {
        console.log(`  - ⚠️ Match 3 status: ${match3.status}, Winner: ${(match3.winner as any)?.name || 'None'}`);
      }
    } else {
      console.log(`❌ Match 3 not found in tournament`);
    }
    
    console.log('');
    
    // 7. Check for any missing matches that should exist
    console.log('🔍 MISSING MATCHES ANALYSIS:');
    console.log('=============================');
    
    // For 10-team tournament, expected structure:
    // Round 1: Matches 1-8 (or fewer if some are byes)
    // Round 2: Matches 1-4 (quarterfinals)
    // Round 3: Matches 1-2 (semifinals)
    // Round 4: Match 1 (final)
    
    const expectedRounds = 4; // For 10 teams
    const expectedMatchesPerRound = [8, 4, 2, 1]; // Theoretical maximum
    
    for (let round = 1; round <= expectedRounds; round++) {
      const roundMatches = matchesByRound[round] || [];
      console.log(`Round ${round}: Found ${roundMatches.length} matches`);
      
      if (roundMatches.length === 0) {
        console.log(`  ❌ No matches found for Round ${round}`);
      } else {
        // Check for gaps in match numbers
        const matchNumbers = roundMatches.map(m => m.matchNumber).sort((a, b) => a - b);
        console.log(`  Match numbers: ${matchNumbers.join(', ')}`);
        
        // Check for missing match numbers
        const maxMatchNumber = Math.max(...matchNumbers);
        for (let i = 1; i <= maxMatchNumber; i++) {
          if (!matchNumbers.includes(i)) {
            console.log(`  ❌ Missing Match ${i} in Round ${round}`);
          }
        }
      }
    }
    
    console.log('');
    
    // 8. Provide recommendations
    console.log('💡 RECOMMENDATIONS:');
    console.log('====================');
    
    const completedMatches = matches.filter(m => m.status === 'completed');
    const pendingMatches = matches.filter(m => m.status === 'pending');
    const scheduledMatches = matches.filter(m => m.status === 'scheduled');
    
    console.log(`📊 Match Status Summary:`);
    console.log(`  - Completed: ${completedMatches.length}`);
    console.log(`  - Scheduled: ${scheduledMatches.length}`);
    console.log(`  - Pending: ${pendingMatches.length}`);
    console.log('');
    
    // Check for completed matches with winners that haven't advanced
    const completedWithWinners = completedMatches.filter(m => m.winner);
    console.log(`🏆 Completed matches with winners: ${completedWithWinners.length}`);
    
    for (const match of completedWithWinners) {
      const nextRound = match.round + 1;
      const nextMatchNumber = Math.ceil(match.matchNumber / 2);
      const nextMatch = matches.find(m => m.round === nextRound && m.matchNumber === nextMatchNumber);
      
      if (nextMatch) {
        const winnerInNextMatch = (nextMatch.team1 as any)?._id?.toString() === (match.winner as any)?._id?.toString() ||
                                 (nextMatch.team2 as any)?._id?.toString() === (match.winner as any)?._id?.toString();
        
        if (!winnerInNextMatch) {
          console.log(`  ❌ Winner of Round ${match.round} Match ${match.matchNumber} not advanced`);
          console.log(`    Winner: ${(match.winner as any).name}`);
          console.log(`    Should be in: Round ${nextRound} Match ${nextMatchNumber}`);
        }
      }
    }
    
    console.log('');
    console.log('🔧 AVAILABLE FIXES:');
    console.log('1. Run: npm run test-advancement <tournament-id>');
    console.log('2. Use API: POST /api/matches/create-missing/' + TOURNAMENT_ID);
    console.log('3. Use API: POST /api/matches/test-advancement/' + TOURNAMENT_ID);
    console.log('4. Use API: POST /api/matches/fix-final/' + TOURNAMENT_ID);
    console.log('');
    
    console.log('🎉 Tournament debug analysis complete!');

  } catch (error: any) {
    console.error('❌ Error debugging tournament:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
debugTournament();