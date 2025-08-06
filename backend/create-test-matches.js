const mongoose = require('mongoose');
require('dotenv').config();

async function createTestMatches() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    
    // Create some test matches
    const Match = mongoose.model('Match', new mongoose.Schema({}, {strict: false}));
    
    const testMatches = [
      {
        tournament: tournamentId,
        round: 1,
        matchNumber: 1,
        player1: null,
        player2: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tournament: tournamentId,
        round: 1,
        matchNumber: 2,
        player1: null,
        player2: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tournament: tournamentId,
        round: 1,
        matchNumber: 3,
        player1: null,
        player2: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        tournament: tournamentId,
        round: 1,
        matchNumber: 4,
        player1: null,
        player2: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Delete any existing matches for this tournament
    await Match.deleteMany({ tournament: tournamentId });
    
    // Insert test matches
    const createdMatches = await Match.insertMany(testMatches);
    
    console.log('✅ Created test matches:', createdMatches.length);
    
    // Verify
    const matchCount = await Match.countDocuments({ tournament: tournamentId });
    console.log('📊 Total matches for tournament:', matchCount);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestMatches();