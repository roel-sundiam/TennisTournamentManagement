const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Player = require('../../dist/models/Player').default;
const Club = require('../../dist/models/Club').default;

const players = [
  'Derek Twano',
  'Mon Henson',
  'Larry Santos',
  'Mervin Nagun',
  'Jad Garbes',
  'Dan Castro',
  'Ismael Dela Paz',
  'Oyet Martin',
  'Jan Carlo Albano',
  'Mike Dunuan',
  'PJ Quiazon',
  'Bi Angeles',
  'Joey Espiritu',
  'Jon Galang',
  'Carl Manuntag',
  'Adrian Raphael Choi',
  'Rafael Pangilinan',
  'Carlos Naguit',
  'Matthew Gatpolintan',
  'John Puri',
  'Miguel Naguit',
  'Jermin David',
  'Eboy Villena',
  'Vonnel Manabat',
  'Marky Aquino Alcantara',
  'Dirk Esguerra',
  'Harvey David',
  'Ron Balboa',
  'Inigo Vergara Vicencio',
  'Jomar Alfonso',
  'Jau Timbol'
];

async function addPlayers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Find Rich Town 2 Tennis Club
    const club = await Club.findOne({ name: { $regex: /Rich Town 2|RichTown2/i } });
    if (!club) {
      console.error('❌ Rich Town 2 Tennis Club not found');
      process.exit(1);
    }
    
    console.log('🎾 Found club:', club.name, 'ID:', club._id);

    // Add each player
    const addedPlayers = [];
    
    for (const playerName of players) {
      const nameParts = playerName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName;
      
      // Check if player already exists
      const existingPlayer = await Player.findOne({
        firstName: firstName,
        lastName: lastName,
        club: club._id
      });
      
      if (existingPlayer) {
        console.log(`⚠️  Player already exists: ${playerName}`);
        continue;
      }
      
      const playerData = {
        firstName,
        lastName,
        skillLevel: 'intermediate', // Default skill level
        club: club._id,
        isActive: true
      };
      
      const newPlayer = await Player.create(playerData);
      addedPlayers.push(newPlayer);
      console.log(`✅ Added player: ${playerName}`);
    }
    
    console.log(`\n🎾 Successfully added ${addedPlayers.length} players to ${club.name}`);
    console.log(`📊 Total players processed: ${players.length}`);
    
  } catch (error) {
    console.error('❌ Error adding players:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
addPlayers();