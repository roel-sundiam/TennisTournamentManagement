import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';
import Player from '../models/Player';
import Bracket from '../models/Bracket';
import User from '../models/User';
import PlayerRegistration from '../models/PlayerRegistration';
import Schedule from '../models/Schedule';
import TimeSlot from '../models/TimeSlot';

/**
 * Clear all data from the database
 */
async function clearDatabase() {
  try {
    console.log('🗑️ Clearing all data from database...');
    
    // Connect to database
    await connectDB();
    
    // Clear all collections
    console.log('Clearing matches...');
    await Match.deleteMany({});
    
    console.log('Clearing teams...');
    await Team.deleteMany({});
    
    console.log('Clearing players...');
    await Player.deleteMany({});
    
    console.log('Clearing brackets...');
    await Bracket.deleteMany({});
    
    console.log('Clearing tournaments...');
    await Tournament.deleteMany({});
    
    console.log('Clearing users...');
    await User.deleteMany({});
    
    console.log('Clearing player registrations...');
    await PlayerRegistration.deleteMany({});
    
    console.log('Clearing schedules...');
    await Schedule.deleteMany({});
    
    console.log('Clearing time slots...');
    await TimeSlot.deleteMany({});
    
    console.log('✅ Database cleared successfully!');
    console.log('📝 You can now test the full flow:');
    console.log('   1. Create a new tournament');
    console.log('   2. Register players');
    console.log('   3. Generate brackets');
    console.log('   4. Start matches');
    console.log('   5. Test live scoring');
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    process.exit();
  }
}

// Run the script
if (require.main === module) {
  clearDatabase();
}

export { clearDatabase };