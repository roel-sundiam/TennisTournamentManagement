import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const fixRicUsername = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Find the user with the space in username
    const user = await User.findOne({ username: 'ric .alfonso.admin' });
    
    if (!user) {
      console.log('❌ User "ric .alfonso.admin" not found');
      return;
    }

    console.log(`📋 Found user: ${user.username}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Role: ${user.role}`);

    // Update the username to remove space
    const newUsername = 'ric.alfonso.admin';
    
    user.username = newUsername;
    await user.save();

    console.log(`✅ Updated username from "ric .alfonso.admin" to "${newUsername}"`);

    // Verify the update
    const updatedUser = await User.findOne({ username: newUsername });
    if (updatedUser) {
      console.log(`✅ Verification successful: User now has username "${updatedUser.username}"`);
    }

  } catch (error) {
    console.error('❌ Error fixing username:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixRicUsername().then(() => process.exit(0));
}

export default fixRicUsername;