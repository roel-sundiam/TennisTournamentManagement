import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const checkUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all users
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    console.log(`\n📊 Total users in database: ${users.length}\n`);
    
    if (users.length > 0) {
      console.log('👥 Users list:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. Username: ${user.username}`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email || 'Not provided'}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Status: ${user.approvalStatus || 'Not set'}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log('   ─────────────────────────────────────────────────────────────────────────');
      });
    } else {
      console.log('❌ No users found in database');
    }

    // Show approval statistics
    const stats = await Promise.all([
      User.countDocuments({ approvalStatus: 'pending' }),
      User.countDocuments({ approvalStatus: 'approved' }),
      User.countDocuments({ approvalStatus: 'rejected' }),
      User.countDocuments({ role: 'super-admin' }),
      User.countDocuments({ role: 'club-admin' }),
      User.countDocuments({ role: 'club-organizer' }),
      User.countDocuments({ role: 'player' })
    ]);

    console.log('\n📈 Statistics:');
    console.log(`   Pending approval: ${stats[0]}`);
    console.log(`   Approved: ${stats[1]}`);
    console.log(`   Rejected: ${stats[2]}`);
    console.log(`   Super admins: ${stats[3]}`);
    console.log(`   Club admins: ${stats[4]}`);
    console.log(`   Club organizers: ${stats[5]}`);
    console.log(`   Players: ${stats[6]}`);

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  checkUsers().then(() => process.exit(0));
}

export default checkUsers;