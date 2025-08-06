import mongoose from 'mongoose';
import User from '../models/User';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const checkUserClubAssignments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all users with their club information
    const users = await User.find()
      .populate('club', 'name subscription.tier address.city address.state')
      .sort({ createdAt: 1 });

    console.log(`\n👥 User Club Assignments (${users.length} total users):`);
    console.log('━'.repeat(80));

    users.forEach((user, index) => {
      const clubInfo = user.club ? 
        `${(user.club as any).name} (${(user.club as any).subscription.tier})` : 
        '❌ No club assigned';
      
      const location = user.club && (user.club as any).address ? 
        ` - 📍 ${(user.club as any).address.city}, ${(user.club as any).address.state}` : '';

      console.log(`${index + 1}. 👤 ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`   📧 ${user.email || 'No email'}`);
      console.log(`   🎭 Role: ${user.role}`);
      console.log(`   ✅ Status: ${user.approvalStatus}`);
      console.log(`   🏢 Club: ${clubInfo}${location}`);
      console.log(`   📅 Registered: ${user.createdAt.toLocaleDateString()}`);
      console.log('─'.repeat(80));
    });

    // Show club summary
    console.log('\n🏢 Club Summary:');
    const clubs = await Club.find({ isActive: true }).sort({ name: 1 });
    
    for (const club of clubs) {
      const clubUsers = await User.find({ club: club._id }).countDocuments();
      console.log(`📋 ${club.name} (${club.subscription.tier}): ${clubUsers} users`);
    }

    // Show unassigned users
    const unassignedUsers = await User.find({ 
      club: { $exists: false }, 
      role: { $ne: 'super-admin' } 
    });
    
    if (unassignedUsers.length > 0) {
      console.log(`\n⚠️  Unassigned Users: ${unassignedUsers.length}`);
      unassignedUsers.forEach(user => {
        console.log(`   • ${user.username} (${user.firstName} ${user.lastName})`);
      });
    } else {
      console.log('\n✅ All non-super-admin users are assigned to clubs');
    }

  } catch (error) {
    console.error('❌ Error checking user club assignments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  checkUserClubAssignments().then(() => process.exit(0));
}

export default checkUserClubAssignments;