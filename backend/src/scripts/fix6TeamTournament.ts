import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered
import '../models';

// Load environment variables
dotenv.config();

const TOURNAMENT_ID = '68789d40b3820a4e4f5ce642';

async function fix6TeamTournament() {
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
    
    console.log(`🔧 Fixing 6-team tournament bracket advancement: ${TOURNAMENT_ID}`);

    // Get tournament details
    const tournament = await Tournament.findById(TOURNAMENT_ID);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    console.log(`📋 Tournament: ${tournament.name} (6 teams)`);

    // For 6-team tournament, the correct bracket structure should be:
    // Round 1: 3 matches (6 teams total)
    // Round 2: 2 matches (3 winners + 1 bye)
    // Round 3: 1 match (final)
    
    // Current issue: Round 2 Match 2 team1 is TBD
    // According to proper 6-team bracket logic:
    // - Match 1 winner vs Match 2 winner in Round 2 Match 1 (semifinal 1)
    // - Match 3 winner gets bye to Round 2 Match 2 team2
    // - Need to create a "bye" or phantom team for Round 2 Match 2 team1
    
    console.log('\n🔍 Current bracket status:');
    
    // Get all matches
    const matches = await Match.find({ tournament: TOURNAMENT_ID })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    const round1Matches = matches.filter(m => m.round === 1);
    const round2Matches = matches.filter(m => m.round === 2);
    
    console.log(`Round 1 matches: ${round1Matches.length}`);
    round1Matches.forEach((match, index) => {
      console.log(`  Match ${match.matchNumber}: ${match.status} - Winner: ${(match.winner as any)?.name || 'None'}`);
    });
    
    console.log(`Round 2 matches: ${round2Matches.length}`);
    round2Matches.forEach((match, index) => {
      console.log(`  Match ${match.matchNumber}: ${match.status} - Team1: ${(match.team1 as any)?.name || 'TBD'}, Team2: ${(match.team2 as any)?.name || 'TBD'}`);
    });
    
    // The issue: Round 2 Match 2 team1 is TBD but should be determined
    // For 6-team tournament, Round 2 Match 2 should be:
    // - Team1: Bye (or Match 3 winner gets automatic advancement)
    // - Team2: Match 3 winner
    
    // Solution: Match 3 winner should get a bye to semifinals
    // Let's fix this by making Round 2 Match 2 have both teams as Match 3 winner
    // This simulates a "bye" where Match 3 winner advances directly
    
    const round2Match2 = round2Matches.find(m => m.matchNumber === 2);
    const match3Winner = round1Matches.find(m => m.matchNumber === 3)?.winner;
    
    if (round2Match2 && match3Winner) {
      console.log(`\n🔧 Fixing Round 2 Match 2:`);
      console.log(`  Current: Team1=${(round2Match2.team1 as any)?.name || 'TBD'}, Team2=${(round2Match2.team2 as any)?.name || 'TBD'}`);
      
      // For 6-team tournament, Match 3 winner should advance directly to Round 3
      // So we need to mark Round 2 Match 2 as completed with Match 3 winner as winner
      
      round2Match2.team1 = match3Winner; // Set both teams as same (bye scenario)
      round2Match2.team2 = match3Winner;
      round2Match2.status = 'completed';
      round2Match2.winner = match3Winner;
      
      // Set a dummy score for the bye
      round2Match2.score = {
        tennisScore: {
          team1Points: 0,
          team2Points: 0,
          team1Games: 0,
          team2Games: 0,
          team1Sets: 1,
          team2Sets: 0,
          currentSet: 1,
          sets: [{
            setNumber: 1,
            team1Games: 0,
            team2Games: 0,
            isTiebreak: false,
            isCompleted: true
          }],
          isDeuce: false,
          advantage: null,
          isMatchPoint: false,
          isSetPoint: false,
          winner: 'team1'
        },
        isCompleted: true,
        startTime: new Date(),
        endTime: new Date(),
        duration: 0
      };
      
      await round2Match2.save();
      console.log(`  Fixed: Team1=${(round2Match2.team1 as any)?.name}, Team2=${(round2Match2.team2 as any)?.name} (BYE)`);
      
      // Now advance the winner to Round 3
      const round3Match = matches.find(m => m.round === 3 && m.matchNumber === 1);
      if (round3Match) {
        console.log(`\n🔧 Advancing to Round 3:`);
        console.log(`  Current: Team1=${(round3Match.team1 as any)?.name || 'TBD'}, Team2=${(round3Match.team2 as any)?.name || 'TBD'}`);
        
        // Round 3 Match 1 should have:
        // Team1: Round 2 Match 1 winner (already set)
        // Team2: Round 2 Match 2 winner (Match 3 winner)
        round3Match.team2 = match3Winner;
        round3Match.status = 'scheduled';
        
        await round3Match.save();
        console.log(`  Fixed: Team1=${(round3Match.team1 as any)?.name}, Team2=${(round3Match.team2 as any)?.name}`);
      }
    }
    
    console.log('\n✅ 6-team tournament bracket fixed successfully!');
    
    // Display final bracket structure
    console.log('\n📊 Final bracket structure:');
    const updatedMatches = await Match.find({ tournament: TOURNAMENT_ID })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    const updatedRound1 = updatedMatches.filter(m => m.round === 1);
    const updatedRound2 = updatedMatches.filter(m => m.round === 2);
    const updatedRound3 = updatedMatches.filter(m => m.round === 3);
    
    console.log('Round 1 (Initial):');
    updatedRound1.forEach(match => {
      console.log(`  Match ${match.matchNumber}: ${(match.team1 as any)?.name} vs ${(match.team2 as any)?.name} → Winner: ${(match.winner as any)?.name || 'TBD'}`);
    });
    
    console.log('Round 2 (Semifinals):');
    updatedRound2.forEach(match => {
      console.log(`  Match ${match.matchNumber}: ${(match.team1 as any)?.name} vs ${(match.team2 as any)?.name} → Winner: ${(match.winner as any)?.name || 'TBD'} (${match.status})`);
    });
    
    console.log('Round 3 (Final):');
    updatedRound3.forEach(match => {
      console.log(`  Match ${match.matchNumber}: ${(match.team1 as any)?.name} vs ${(match.team2 as any)?.name} → Winner: ${(match.winner as any)?.name || 'TBD'} (${match.status})`);
    });

  } catch (error: any) {
    console.error('❌ Error fixing 6-team tournament:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
fix6TeamTournament();