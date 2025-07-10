import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();
import Player from '../models/Player';
import PlayerRegistration from '../models/PlayerRegistration';

/**
 * Create players only (no tournament or registrations)
 */
async function createPlayersOnly() {
  try {
    console.log('🎾 Creating players without tournament registrations...');
    
    // Connect to database
    await connectDB();
    
    // Clear only player registrations, keep players if they exist
    console.log('Clearing player registrations...');
    await PlayerRegistration.deleteMany({});
    
    // Check if players already exist
    const existingPlayers = await Player.find({});
    if (existingPlayers.length > 0) {
      console.log(`✅ Found ${existingPlayers.length} existing players, keeping them`);
      console.log('Players available:');
      existingPlayers.forEach((player: any, index: number) => {
        console.log(`  ${index + 1}. ${player.firstName} ${player.lastName} (${player.skillLevel})`);
      });
      return;
    }
    
    // Create sample players (no tournament association)
    console.log('Creating fresh players...');
    const playersData = [
      { firstName: 'Rafael', lastName: 'Nadal', email: 'rafael@test.com', skillLevel: 'professional', ranking: 1 },
      { firstName: 'Roger', lastName: 'Federer', email: 'roger@test.com', skillLevel: 'professional', ranking: 2 },
      { firstName: 'Serena', lastName: 'Williams', email: 'serena@test.com', skillLevel: 'professional', ranking: 3 },
      { firstName: 'Novak', lastName: 'Djokovic', email: 'novak@test.com', skillLevel: 'professional', ranking: 4 },
      { firstName: 'Maria', lastName: 'Sharapova', email: 'maria@test.com', skillLevel: 'advanced', ranking: 5 },
      { firstName: 'Andy', lastName: 'Murray', email: 'andy@test.com', skillLevel: 'advanced', ranking: 6 },
      { firstName: 'Steffi', lastName: 'Graf', email: 'steffi@test.com', skillLevel: 'professional', ranking: 7 },
      { firstName: 'Pete', lastName: 'Sampras', email: 'pete@test.com', skillLevel: 'advanced', ranking: 8 },
      { firstName: 'Monica', lastName: 'Seles', email: 'monica@test.com', skillLevel: 'advanced', ranking: 9 },
      { firstName: 'John', lastName: 'McEnroe', email: 'john@test.com', skillLevel: 'intermediate', ranking: 10 },
      { firstName: 'Billie', lastName: 'Jean King', email: 'billie@test.com', skillLevel: 'intermediate', ranking: 11 },
      { firstName: 'Boris', lastName: 'Becker', email: 'boris@test.com', skillLevel: 'intermediate', ranking: 12 },
      { firstName: 'Chris', lastName: 'Evert', email: 'chris@test.com', skillLevel: 'advanced', ranking: 13 },
      { firstName: 'Andre', lastName: 'Agassi', email: 'andre@test.com', skillLevel: 'professional', ranking: 14 },
      { firstName: 'Martina', lastName: 'Navratilova', email: 'martina@test.com', skillLevel: 'professional', ranking: 15 },
      { firstName: 'Jimmy', lastName: 'Connors', email: 'jimmy@test.com', skillLevel: 'advanced', ranking: 16 }
    ];
    
    const createdPlayers = [];
    
    for (let i = 0; i < playersData.length; i++) {
      const playerData = playersData[i];
      
      // Create player (no tournament association)
      const player = new Player({
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        email: playerData.email,
        skillLevel: playerData.skillLevel,
        ranking: playerData.ranking,
        isActive: true
      });
      await player.save();
      createdPlayers.push(player);
      
      console.log(`✅ Created player: ${player.firstName} ${player.lastName} (${player.skillLevel})`);
    }
    
    console.log('\n🎉 Players created successfully!');
    console.log('📊 Summary:');
    console.log(`- Players Created: ${createdPlayers.length}`);
    console.log(`- Player Registrations: 0 (cleared)`);
    console.log('\n🎾 Players are ready for tournament registration!');
    console.log('Next steps:');
    console.log('1. Create a tournament in the frontend');
    console.log('2. Register these players for the tournament');
    console.log('3. Test the complete registration workflow');
    
  } catch (error) {
    console.error('❌ Error creating players:', error);
  } finally {
    process.exit();
  }
}

// Run the script
if (require.main === module) {
  createPlayersOnly();
}

export { createPlayersOnly };