import mongoose from 'mongoose';
import User from '../models/User';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const reassignUserClub = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all clubs for reference
    const clubs = await Club.find({ isActive: true }).sort({ name: 1 });
    console.log('\n🏢 Available clubs:');
    clubs.forEach((club, index) => {
      console.log(`${index + 1}. ${club.name} (${club.subscription.tier}) - ID: ${club._id}`);
    });

    // Get all users with their current club assignments
    const users = await User.find({ role: { $ne: 'super-admin' } })
      .populate('club', 'name subscription.tier')
      .sort({ username: 1 });

    console.log('\n👥 Current user assignments:');
    users.forEach((user, index) => {
      const clubInfo = user.club ? 
        `${(user.club as any).name} (${(user.club as any).subscription.tier})` : 
        'No club assigned';
      console.log(`${index + 1}. ${user.username} → ${clubInfo}`);
    });

    console.log('\n🔄 Example reassignment commands:');
    console.log('To reassign RichTown2Tennis to Elite Tennis Center:');
    console.log('npm run reassign-user RichTown2Tennis 6873b532207fd3d7b072ab78');
    console.log('\nTo reassign testuser to Metro Tennis Club:');
    console.log('npm run reassign-user testuser 6873b37a6120da49aa21dc49');
    
    console.log('\n💡 Club IDs for reference:');
    clubs.forEach(club => {
      console.log(`   ${club.name}: ${club._id}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

const reassignSpecificUser = async (username: string, newClubId: string) => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Find the user
    const user = await User.findOne({ username })
      .populate('club', 'name subscription.tier');

    if (!user) {
      console.log(`❌ User '${username}' not found`);
      return;
    }

    // Find the new club
    const newClub = await Club.findById(newClubId);
    if (!newClub) {
      console.log(`❌ Club with ID '${newClubId}' not found`);
      return;
    }

    const oldClubInfo = user.club ? 
      `${(user.club as any).name} (${(user.club as any).subscription.tier})` : 
      'No club';

    console.log(`\n🔄 Reassigning user:`);
    console.log(`   👤 User: ${user.username} (${user.firstName} ${user.lastName})`);
    console.log(`   🏢 From: ${oldClubInfo}`);
    console.log(`   🏢 To: ${newClub.name} (${newClub.subscription.tier})`);

    // Update the user's club assignment
    user.club = newClub._id as any;
    await user.save();

    console.log(`\n✅ Successfully reassigned ${username} to ${newClub.name}`);
    console.log(`   📍 Location: ${newClub.address?.street || 'No address'}`);
    console.log(`   💎 Tier: ${newClub.subscription.tier}`);

    // Show updated assignment
    const updatedUser = await User.findById(user._id)
      .populate('club', 'name subscription.tier address.city address.state');
    
    if (updatedUser?.club) {
      const club = updatedUser.club as any;
      console.log(`\n📊 Updated assignment:`);
      console.log(`   ${updatedUser.username} → ${club.name} (${club.subscription.tier})`);
    }

  } catch (error) {
    console.error('❌ Error reassigning user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Check if running with command line arguments
const args = process.argv.slice(2);
if (args.length === 2 && require.main === module) {
  const [username, clubId] = args;
  console.log(`🔄 Reassigning ${username} to club ${clubId}...`);
  reassignSpecificUser(username, clubId).then(() => process.exit(0));
} else if (require.main === module) {
  reassignUserClub().then(() => process.exit(0));
}

export { reassignUserClub, reassignSpecificUser };