import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const updateBotSundiPassword = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Find and update BotSundi password properly (to trigger pre-save hooks)
    const user = await User.findOne({ username: 'BotSundi' });
    
    if (!user) {
      console.log('❌ BotSundi user not found');
      return;
    }

    // Update password and save to trigger hashing
    user.password = 'AdminPassword123';
    const updatedUser = await user.save();

    if (updatedUser) {
      console.log('✅ BotSundi password updated successfully');
      console.log('New credentials:');
      console.log('Username: BotSundi');
      console.log('Password: AdminPassword123');
    } else {
      console.log('❌ BotSundi user not found');
    }

  } catch (error) {
    console.error('❌ Error updating BotSundi password:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  updateBotSundiPassword().then(() => process.exit(0));
}

export default updateBotSundiPassword;