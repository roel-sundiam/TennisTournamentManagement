import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const updateBotSundi = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Update BotSundi to be approved
    const updatedUser = await User.findOneAndUpdate(
      { username: 'BotSundi' },
      { 
        approvalStatus: 'approved',
        approvedAt: new Date(),
        isActive: true
      },
      { new: true }
    );

    if (updatedUser) {
      console.log('✅ BotSundi user updated successfully');
      console.log(`Status: ${updatedUser.approvalStatus}`);
      console.log(`Approved at: ${updatedUser.approvedAt}`);
    } else {
      console.log('❌ BotSundi user not found');
    }

  } catch (error) {
    console.error('❌ Error updating BotSundi user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  updateBotSundi().then(() => process.exit(0));
}

export default updateBotSundi;