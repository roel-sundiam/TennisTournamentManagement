import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered
import '../models';

// Load environment variables
dotenv.config();

async function fixTournamentBracketAdvancement() {
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

    const tournamentId = '68789d40b3820a4e4f5ce642';
    
    console.log(`🔧 Fixing bracket advancement for tournament: ${tournamentId}`);

    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }
    
    console.log(`📋 Tournament: ${tournament.name}`);

    // Get Round 1 completed matches to find winners
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1,
      status: 'completed'
    }).populate('winner', 'name players');

    console.log(`📊 Found ${round1Matches.length} completed Round 1 matches`);

    if (round1Matches.length !== 2) {
      throw new Error(`Expected 2 completed Round 1 matches, found ${round1Matches.length}`);
    }

    // Sort matches by match number
    round1Matches.sort((a, b) => a.matchNumber - b.matchNumber);

    // Extract winners
    const match1Winner = round1Matches[0].winner;
    const match2Winner = round1Matches[1].winner;

    console.log(`🏆 Match 1 Winner: ${(match1Winner as any)?.name || 'No winner'}`);
    console.log(`🏆 Match 2 Winner: ${(match2Winner as any)?.name || 'No winner'}`);

    if (!match1Winner || !match2Winner) {
      throw new Error('Both Round 1 matches must have winners');
    }

    // Check if Round 2 match exists
    let finalMatch = await Match.findOne({ 
      tournament: tournamentId, 
      round: 2,
      matchNumber: 1
    });

    if (!finalMatch) {
      console.log('⚡ Creating missing final match...');
      
      // Create the final match
      finalMatch = await Match.create({
        tournament: tournamentId,
        club: tournament.club,
        round: 2,
        matchNumber: 1,
        team1: (match1Winner as any)._id || match1Winner,
        team2: (match2Winner as any)._id || match2Winner,
        bracket: round1Matches[0].bracket, // Use the same bracket ID
        bracketPosition: {
          round: 2,
          position: 1
        },
        status: 'scheduled',
        matchFormat: 'best-of-3',
        gameFormat: tournament.gameFormat || 'regular',
        estimatedDuration: 90,
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
            isSetPoint: false,
            winner: null
          },
          isCompleted: false
        }
      });

      console.log('✅ Created final match with teams assigned');
    } else {
      console.log('📝 Updating existing final match...');
      
      // Update existing final match with winners
      finalMatch.team1 = (match1Winner as any)._id || match1Winner;
      finalMatch.team2 = (match2Winner as any)._id || match2Winner;
      finalMatch.status = 'scheduled';
      await finalMatch.save();
      
      console.log('✅ Updated final match with teams assigned');
    }

    // Populate the final match for display
    await finalMatch.populate([
      {
        path: 'team1',
        select: 'name players seed',
        populate: {
          path: 'players',
          select: 'firstName lastName ranking'
        }
      },
      {
        path: 'team2',
        select: 'name players seed',
        populate: {
          path: 'players',
          select: 'firstName lastName ranking'
        }
      }
    ]);

    console.log('🎾 Final Match Details:');
    console.log(`  Team 1: ${(finalMatch.team1 as any)?.name}`);
    console.log(`  Team 2: ${(finalMatch.team2 as any)?.name}`);
    console.log(`  Status: ${finalMatch.status}`);
    console.log(`  Match ID: ${finalMatch._id}`);

    console.log('🎉 Tournament bracket advancement fixed successfully!');

  } catch (error: any) {
    console.error('❌ Error fixing tournament bracket:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
fixTournamentBracketAdvancement();