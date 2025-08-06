const mongoose = require('mongoose');
require('dotenv').config();

async function fixMissingRounds() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match, Tournament } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== CREATING MISSING ROUNDS ===');
    
    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('Tournament not found!');
      return;
    }
    
    // For 8 teams single elimination: 4 → 2 → 1 (3 rounds total)
    console.log('Creating Round 2 (Semifinals)...');
    
    // Get existing bracket and club info
    const { Bracket } = require('./dist/models/index');
    const bracket = await Bracket.findOne({ tournament: tournamentId });
    const clubId = new mongoose.Types.ObjectId('687480d42819d8b020c282c9');
    
    // Create Round 2 matches (semifinals)
    const round2Match1 = await Match.create({
      tournament: tournamentId,
      club: clubId,
      round: 2,
      matchNumber: 1,
      status: 'pending',
      matchFormat: 'best-of-3',
      gameFormat: 'regular',
      bracket: bracket._id,
      bracketPosition: {
        round: 2,
        position: 1
      },
      score: {
        tennisScore: {
          team1Points: 0,
          team2Points: 0,
          team1Games: 0,
          team2Games: 0,
          team1Sets: 0,
          team2Sets: 0,
          currentSet: 1,
          sets: [],
          isDeuce: false,
          advantage: null,
          isMatchPoint: false,
          isSetPoint: false
        },
        isCompleted: false
      }
    });
    
    const round2Match2 = await Match.create({
      tournament: tournamentId,
      club: clubId,
      round: 2,
      matchNumber: 2,
      status: 'pending',
      matchFormat: 'best-of-3',
      gameFormat: 'regular',
      bracket: bracket._id,
      bracketPosition: {
        round: 2,
        position: 2
      },
      score: {
        tennisScore: {
          team1Points: 0,
          team2Points: 0,
          team1Games: 0,
          team2Games: 0,
          team1Sets: 0,
          team2Sets: 0,
          currentSet: 1,
          sets: [],
          isDeuce: false,
          advantage: null,
          isMatchPoint: false,
          isSetPoint: false
        },
        isCompleted: false
      }
    });
    
    console.log('✅ Created Round 2 Match 1:', round2Match1._id);
    console.log('✅ Created Round 2 Match 2:', round2Match2._id);
    
    console.log('Creating Round 3 (Final)...');
    
    // Create Round 3 match (final)
    const round3Match1 = await Match.create({
      tournament: tournamentId,
      club: clubId,
      round: 3,
      matchNumber: 1,
      status: 'pending',
      matchFormat: 'best-of-3',
      gameFormat: 'regular',
      bracket: bracket._id,
      bracketPosition: {
        round: 3,
        position: 1
      },
      score: {
        tennisScore: {
          team1Points: 0,
          team2Points: 0,
          team1Games: 0,
          team2Games: 0,
          team1Sets: 0,
          team2Sets: 0,
          currentSet: 1,
          sets: [],
          isDeuce: false,
          advantage: null,
          isMatchPoint: false,
          isSetPoint: false
        },
        isCompleted: false
      }
    });
    
    console.log('✅ Created Round 3 Match 1 (Final):', round3Match1._id);
    
    console.log('\n🎯 Missing rounds created! Now the winner advancement should work.');
    console.log('The system can now advance Round 1 winners to Round 2 semifinals.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixMissingRounds();