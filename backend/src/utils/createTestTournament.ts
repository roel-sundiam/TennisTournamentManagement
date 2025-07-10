import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();
import Tournament from '../models/Tournament';
import User from '../models/User';

/**
 * Create a test tournament for player registration
 */
async function createTestTournament() {
  try {
    console.log('🎾 Creating test tournament...');
    
    // Connect to database
    await connectDB();
    
    // Check if a tournament already exists
    const existingTournament = await Tournament.findOne({});
    if (existingTournament) {
      console.log('✅ Tournament already exists:', existingTournament.name);
      console.log('📝 Tournament ID:', existingTournament._id);
      return;
    }
    
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
    
    // Create a test tournament
    console.log('Creating tournament...');
    const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const tournament = new Tournament({
      name: 'Test Tournament for Player Registration',
      description: 'A test tournament to register players and test the system',
      startDate: startDate,
      endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after start
      registrationDeadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days from now
      maxPlayers: 16,
      currentPlayers: 0,
      format: 'single-elimination',
      gameType: 'singles',
      status: 'registration-open',
      entryFee: 0,
      prizePool: 0,
      venue: 'Test Tennis Center',
      rules: 'Best of 3 sets',
      organizer: organizer._id
    });
    await tournament.save();
    console.log('✅ Tournament created:', tournament.name);
    console.log('📝 Tournament ID:', tournament._id);
    console.log('🔗 Use this ID when creating players');
    
  } catch (error) {
    console.error('❌ Error creating test tournament:', error);
  } finally {
    process.exit();
  }
}

// Run the script
if (require.main === module) {
  createTestTournament();
}

export { createTestTournament };