import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();
import Tournament from '../models/Tournament';
import Player from '../models/Player';
import PlayerRegistration from '../models/PlayerRegistration';
import User from '../models/User';

/**
 * Create players for a specific tournament
 */
async function createPlayersForTournament() {
  try {
    console.log('🎾 Creating players for tournament...');
    
    // Connect to database
    await connectDB();
    
    // Create a sample organizer user if none exists
    let organizer = await User.findOne({ role: 'organizer' });
    if (!organizer) {
      console.log('Creating organizer...');
      organizer = new User({
        username: 'testorganizer',
        firstName: 'Test',
        lastName: 'Organizer',
        email: 'organizer@test.com',
        password: 'password123',
        role: 'organizer'
      });
      await organizer.save();
      console.log('✅ Organizer created');
    }
    
    // Create or find test tournament
    let tournament = await Tournament.findOne({ name: 'Test Tournament for Players' });
    if (!tournament) {
      console.log('Creating tournament...');
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      tournament = new Tournament({
        name: 'Test Tournament for Players',
        description: 'Tournament for testing player registration and management',
        startDate: startDate,
        endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        maxPlayers: 16,
        currentPlayers: 0,
        format: 'single-elimination',
        gameType: 'singles',
        gameFormat: 'regular', // Tennis format
        status: 'registration-open',
        entryFee: 0,
        prizePool: 0,
        venue: 'Test Tennis Center',
        rules: 'Best of 3 sets',
        organizer: organizer._id
      });
      await tournament.save();
      console.log('✅ Tournament created:', tournament.name);
    }
    
    console.log('📝 Tournament ID:', tournament._id);
    
    // Create sample players
    console.log('Creating players...');
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
      { firstName: 'Boris', lastName: 'Becker', email: 'boris@test.com', skillLevel: 'intermediate', ranking: 12 }
    ];
    
    const createdPlayers = [];
    const createdRegistrations = [];
    
    for (let i = 0; i < playersData.length; i++) {
      const playerData = playersData[i];
      
      // Create player
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
      
      // Register player for tournament
      const registration = new PlayerRegistration({
        player: player._id,
        tournament: tournament._id,
        seed: i + 1, // Sequential seeding
        registrationDate: new Date(),
        isActive: true
      });
      await registration.save();
      createdRegistrations.push(registration);
      
      console.log(`✅ Created player: ${player.firstName} ${player.lastName} (Seed #${i + 1})`);
    }
    
    // Update tournament player count
    tournament.currentPlayers = createdPlayers.length;
    await tournament.save();
    
    console.log('\n🎉 Players created successfully!');
    console.log('📊 Summary:');
    console.log(`- Tournament: ${tournament.name}`);
    console.log(`- Tournament ID: ${tournament._id}`);
    console.log(`- Players Created: ${createdPlayers.length}`);
    console.log(`- Player Registrations: ${createdRegistrations.length}`);
    console.log(`- Tournament Status: ${tournament.status}`);
    console.log('\n🎾 You can now view players in the frontend and proceed with seeding!');
    
  } catch (error) {
    console.error('❌ Error creating players:', error);
  } finally {
    process.exit();
  }
}

// Run the script
if (require.main === module) {
  createPlayersForTournament();
}

export { createPlayersForTournament };