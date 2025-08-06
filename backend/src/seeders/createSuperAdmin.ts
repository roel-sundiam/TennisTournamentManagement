import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Check if BotSundi already exists
    const existingUser = await User.findOne({ username: 'BotSundi' });
    if (existingUser) {
      console.log('BotSundi super-admin user already exists');
      return;
    }

    // Create BotSundi super-admin user
    const superAdmin = await User.create({
      username: 'BotSundi',
      email: 'botsundi@tennismanagement.com',
      password: 'SuperSecurePassword123!',
      firstName: 'Bot',
      lastName: 'Sundi',
      role: 'super-admin',
      isActive: true
    });

    console.log('✅ BotSundi super-admin user created successfully');
    console.log(`User ID: ${superAdmin._id}`);
    console.log('Credentials:');
    console.log('Username: BotSundi');
    console.log('Password: SuperSecurePassword123!');

  } catch (error) {
    console.error('❌ Error creating super-admin user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  createSuperAdmin().then(() => process.exit(0));
}

export default createSuperAdmin;