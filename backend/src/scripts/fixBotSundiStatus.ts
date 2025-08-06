import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const fixBotSundiStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Find and update BotSundi user
    const user = await User.findOne({ username: 'BotSundi' });
    
    if (!user) {
      console.log('❌ BotSundi user not found');
      return;
    }

    console.log(`📋 Found user: ${user.username}`);
    console.log(`   Current status: ${user.approvalStatus}`);
    console.log(`   Role: ${user.role}`);

    // Update the approval status
    user.approvalStatus = 'approved';
    user.approvedAt = new Date();
    await user.save();

    console.log(`✅ Updated BotSundi status to "approved"`);

    // Verify the update
    const updatedUser = await User.findOne({ username: 'BotSundi' });
    if (updatedUser) {
      console.log(`✅ Verification successful: Status is now "${updatedUser.approvalStatus}"`);
    }

  } catch (error) {
    console.error('❌ Error fixing BotSundi status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixBotSundiStatus().then(() => process.exit(0));
}

export default fixBotSundiStatus;