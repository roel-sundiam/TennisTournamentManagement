import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const fixUserApprovalStatus = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Update users without approval status to have proper default values
    const usersWithoutStatus = await User.find({
      $or: [
        { approvalStatus: { $exists: false } },
        { approvalStatus: null },
        { approvalStatus: undefined }
      ]
    });

    console.log(`Found ${usersWithoutStatus.length} users without approval status`);

    for (const user of usersWithoutStatus) {
      console.log(`Updating user: ${user.username} (${user.role})`);
      
      // Set approval status based on role
      if (user.role === 'super-admin') {
        user.approvalStatus = 'approved';
        user.approvedAt = new Date();
      } else {
        user.approvalStatus = 'pending';
      }
      
      await user.save();
      console.log(`✅ Updated ${user.username} to ${user.approvalStatus}`);
    }

    // Check final stats
    const stats = await Promise.all([
      User.countDocuments({ approvalStatus: 'pending' }),
      User.countDocuments({ approvalStatus: 'approved' }),
      User.countDocuments({ approvalStatus: 'rejected' }),
      User.countDocuments({})
    ]);

    console.log('\n📈 Final Statistics:');
    console.log(`   Pending: ${stats[0]}`);
    console.log(`   Approved: ${stats[1]}`);
    console.log(`   Rejected: ${stats[2]}`);
    console.log(`   Total: ${stats[3]}`);

  } catch (error) {
    console.error('❌ Error fixing user approval status:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  fixUserApprovalStatus().then(() => process.exit(0));
}

export default fixUserApprovalStatus;