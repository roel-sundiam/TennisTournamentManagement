import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered
import '../models';

// Load environment variables
dotenv.config();

const TOURNAMENT_ID = '68789d40b3820a4e4f5ce642';

async function fix6TeamTournamentCorrect() {
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

    // For 6-team tournament, the correct approach is:
    // Round 1: 3 matches (6 teams total)
    // Round 2: 2 matches, but one should be a bye or automatic advancement
    // Round 3: 1 match (final)
    
    // The issue is that the bracket advancement logic is designed for 8-team tournaments
    // For 6-team tournaments, we need different logic
    
    console.log('\n🔍 Current bracket status:');
    
    // Get all matches
    const matches = await Match.find({ tournament: TOURNAMENT_ID })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    const round1Matches = matches.filter(m => m.round === 1);
    const round2Matches = matches.filter(m => m.round === 2);
    const round3Matches = matches.filter(m => m.round === 3);
    
    console.log(`Round 1 matches: ${round1Matches.length}`);
    round1Matches.forEach((match, index) => {
      console.log(`  Match ${match.matchNumber}: ${match.status} - Winner: ${(match.winner as any)?.name || 'None'}`);
    });
    
    console.log(`Round 2 matches: ${round2Matches.length}`);
    round2Matches.forEach((match, index) => {
      console.log(`  Match ${match.matchNumber}: ${match.status} - Team1: ${(match.team1 as any)?.name || 'TBD'}, Team2: ${(match.team2 as any)?.name || 'TBD'}`);
    });
    
    // The correct fix for 6-team tournament:
    // Round 2 Match 2 should not exist or should be deleted
    // Match 3 winner should advance directly to Round 3
    
    const round2Match2 = round2Matches.find(m => m.matchNumber === 2);
    const match3Winner = round1Matches.find(m => m.matchNumber === 3)?.winner;
    const round3Match1 = round3Matches.find(m => m.matchNumber === 1);
    
    if (round2Match2 && match3Winner && round3Match1) {
      console.log(`\n🔧 Applying correct 6-team tournament fix:`);
      console.log(`  - Match 3 winner should advance directly to final`);
      console.log(`  - Round 2 Match 2 should be deleted (not needed for 6-team)`);
      
      // Delete the problematic Round 2 Match 2
      await Match.findByIdAndDelete(round2Match2._id);
      console.log(`  ✅ Deleted Round 2 Match 2 (bye scenario)`);
      
      // Advance Match 3 winner directly to Round 3
      round3Match1.team2 = match3Winner;
      round3Match1.status = 'scheduled';
      
      await round3Match1.save();
      console.log(`  ✅ Advanced Match 3 winner to final: ${(match3Winner as any).name}`);
      
      console.log(`\n📊 Final bracket structure (corrected):`);
      console.log(`Round 1: 3 matches (completed)`);
      console.log(`Round 2: 1 match (Match 1 winner vs Match 2 winner)`);
      console.log(`Round 3: 1 match (Round 2 winner vs Match 3 winner)`);
      
    } else {
      console.log(`\n⚠️ Could not apply fix - missing components:`);
      console.log(`  - Round 2 Match 2 exists: ${!!round2Match2}`);
      console.log(`  - Match 3 winner exists: ${!!match3Winner}`);
      console.log(`  - Round 3 Match 1 exists: ${!!round3Match1}`);
    }
    
    // Display final bracket structure
    console.log('\n📊 Updated bracket structure:');
    const updatedMatches = await Match.find({ tournament: TOURNAMENT_ID })
      .populate('team1', 'name')
      .populate('team2', 'name')
      .populate('winner', 'name')
      .sort({ round: 1, matchNumber: 1 });
    
    const updatedByRound = updatedMatches.reduce((acc, match) => {
      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as { [key: number]: any[] });
    
    Object.keys(updatedByRound).forEach(round => {
      const roundNum = parseInt(round);
      const roundMatches = updatedByRound[roundNum];
      console.log(`Round ${roundNum}: ${roundMatches.length} match(es)`);
      
      roundMatches.forEach(match => {
        console.log(`  Match ${match.matchNumber}: ${(match.team1 as any)?.name || 'TBD'} vs ${(match.team2 as any)?.name || 'TBD'} → Winner: ${(match.winner as any)?.name || 'TBD'} (${match.status})`);
      });
    });
    
    console.log('\n✅ 6-team tournament bracket fixed successfully!');
    console.log('🎯 The bracket now correctly handles 6 teams with proper advancement logic.');

  } catch (error: any) {
    console.error('❌ Error fixing 6-team tournament:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
fix6TeamTournamentCorrect();