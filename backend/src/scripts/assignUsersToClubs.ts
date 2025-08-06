import mongoose from 'mongoose';
import User from '../models/User';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const assignUsersToClubs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all clubs
    const clubs = await Club.find({ isActive: true }).sort({ createdAt: 1 });
    console.log(`\n🏢 Available clubs:`);
    clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name} (${club.subscription.tier}) - ID: ${club._id}`);
    });

    // Get users without club assignments
    const usersWithoutClub = await User.find({ 
      club: { $exists: false },
      role: { $ne: 'super-admin' },
      approvalStatus: 'approved'
    });

    console.log(`\n👥 Users without club assignment: ${usersWithoutClub.length}`);
    
    if (usersWithoutClub.length === 0) {
      console.log('✅ All users are already assigned to clubs');
      return;
    }

    for (const user of usersWithoutClub) {
      console.log(`\n📋 Assigning user: ${user.username} (${user.firstName} ${user.lastName})`);
      
      // For this example, let's assign users to specific clubs:
      // RichTown2Tennis -> Metro Tennis Club (Premium)
      // testuser -> Riverside Tennis Academy (Free)
      
      let targetClub;
      if (user.username === 'RichTown2Tennis') {
        targetClub = clubs.find(club => club.name === 'Metro Tennis Club');
        console.log(`   → Assigning to Metro Tennis Club (Premium features)`);
      } else if (user.username === 'testuser') {
        targetClub = clubs.find(club => club.name === 'Riverside Tennis Academy');
        console.log(`   → Assigning to Riverside Tennis Academy (Free tier)`);
      } else {
        // For any other users, assign to Elite Tennis Center
        targetClub = clubs.find(club => club.name === 'Elite Tennis Center');
        console.log(`   → Assigning to Elite Tennis Center (Enterprise)`);
      }

      if (targetClub) {
        user.club = targetClub._id as any;
        await user.save();
        console.log(`   ✅ Successfully assigned to ${targetClub.name}`);
        console.log(`   📍 Location: ${targetClub.address?.street || 'No address'}`);
        console.log(`   💎 Tier: ${targetClub.subscription.tier}`);
      } else {
        console.log(`   ❌ Target club not found`);
      }
    }

    // Show final assignments
    console.log('\n📊 Final club assignments:');
    const allUsers = await User.find({ role: { $ne: 'super-admin' } })
      .populate('club', 'name subscription.tier')
      .sort({ createdAt: 1 });

    allUsers.forEach(user => {
      const clubInfo = user.club ? 
        `${(user.club as any).name} (${(user.club as any).subscription.tier})` : 
        'No club assigned';
      console.log(`   ${user.username}: ${clubInfo}`);
    });

  } catch (error) {
    console.error('❌ Error assigning users to clubs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  assignUsersToClubs().then(() => process.exit(0));
}

export default assignUsersToClubs;