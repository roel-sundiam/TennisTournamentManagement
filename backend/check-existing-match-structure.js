const mongoose = require('mongoose');
require('dotenv').config();

async function checkExistingMatchStructure() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Match, Bracket } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    // Get an existing match to see the correct structure
    const existingMatch = await Match.findOne({ tournament: tournamentId });
    if (existingMatch) {
      console.log('Existing match structure:');
      console.log('  bracket:', existingMatch.bracket);
      console.log('  matchFormat:', existingMatch.matchFormat);
      console.log('  gameFormat:', existingMatch.gameFormat);
      console.log('  club:', existingMatch.club);
    }
    
    // Check if bracket exists
    const bracket = await Bracket.findOne({ tournament: tournamentId });
    if (bracket) {
      console.log('Bracket ID:', bracket._id);
    } else {
      console.log('No bracket found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkExistingMatchStructure();