const mongoose = require('mongoose');
require('dotenv').config();

// Player Registration Schema (inline)
const playerRegistrationSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    required: true
  },
  registrationDate: {
    type: Date,
    default: Date.now
  },
  seed: {
    type: Number,
    min: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: String
});

const PlayerRegistration = mongoose.model('PlayerRegistration', playerRegistrationSchema);

async function registerPlayers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const tournamentId = '68675f2562ed5c9316d4d771';
    const playerIds = [
      '68676025d7fdbda63cb673b3', // Player 2
      '68675f76d7fdbda63cb6739e'  // Player 1
    ];

    console.log(`Registering players ${playerIds.join(', ')} for tournament ${tournamentId}`);

    // Check if already registered
    const existing = await PlayerRegistration.find({
      tournament: tournamentId,
      player: { $in: playerIds },
      isActive: true
    });

    if (existing.length > 0) {
      console.log('Some players already registered:', existing);
      process.exit(1);
    }

    // Create registrations
    const registrations = playerIds.map((playerId, index) => ({
      player: playerId,
      tournament: tournamentId,
      registrationDate: new Date(),
      isActive: true,
      seed: index + 1
    }));

    const result = await PlayerRegistration.insertMany(registrations);
    console.log('Successfully registered players:', result);

    // Update tournament player count
    const Tournament = mongoose.model('Tournament', new mongoose.Schema({}, { strict: false }));
    await Tournament.findByIdAndUpdate(tournamentId, {
      $inc: { currentPlayers: playerIds.length }
    });

    console.log('Updated tournament player count');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

registerPlayers();