import mongoose from 'mongoose';
import Club from '../models/Club';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const deleteAllClubs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all clubs first to see what we're deleting
    const clubs = await Club.find({});
    console.log(`\n🗑️ Found ${clubs.length} clubs to delete:`);
    
    clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name} (ID: ${club._id})`);
    });

    // Delete all clubs
    const clubDeleteResult = await Club.deleteMany({});
    console.log(`\n✅ Deleted ${clubDeleteResult.deletedCount} clubs`);

    // Also delete all club admin users (keep BotSundi super-admin)
    const userDeleteResult = await User.deleteMany({ 
      role: { $in: ['club-admin', 'club-organizer'] } 
    });
    console.log(`✅ Deleted ${userDeleteResult.deletedCount} club users`);

    // Show remaining users
    const remainingUsers = await User.find({});
    console.log(`\n👥 Remaining users: ${remainingUsers.length}`);
    remainingUsers.forEach(user => {
      console.log(`- ${user.username} (${user.role})`);
    });

  } catch (error) {
    console.error('❌ Error deleting clubs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  deleteAllClubs().then(() => process.exit(0));
}

export default deleteAllClubs;