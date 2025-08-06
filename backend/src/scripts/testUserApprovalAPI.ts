import mongoose from 'mongoose';
import User from '../models/User';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const testUserApprovalAPI = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Test the same query that the API uses
    const users = await User.find({})
      .select('-password')
      .populate('approvedBy', 'username firstName lastName')
      .populate('club', 'name subscription.tier address.city address.state')
      .sort({ createdAt: -1 });

    console.log('\n📊 API Query Results:');
    console.log('━'.repeat(80));

    users.forEach((user, index) => {
      console.log(`\n${index + 1}. 👤 ${user.username} (${user.firstName} ${user.lastName})`);
      console.log(`   📧 Email: ${user.email || 'No email'}`);
      console.log(`   🎭 Role: ${user.role}`);
      console.log(`   ✅ Status: ${user.approvalStatus}`);
      
      if (user.club) {
        const club = user.club as any;
        console.log(`   🏢 Club: ${club.name} (${club.subscription?.tier})`);
        console.log(`   📍 Location: ${club.address?.street || 'No address'}`);
        console.log(`   📊 Club Object Type: ${typeof user.club}`);
        console.log(`   📊 Club Object Keys:`, Object.keys(club));
      } else {
        console.log(`   🏢 Club: No club assigned`);
        console.log(`   📊 Club Property:`, user.club);
      }
      
      console.log(`   📅 Created: ${user.createdAt}`);
    });

    // Test the exact query that would be sent to frontend
    console.log('\n🔍 JSON Output (what frontend receives):');
    const jsonOutput = {
      success: true,
      data: users,
      pagination: {
        current: 1,
        pages: 1,
        total: users.length,
        limit: 20
      }
    };
    
    console.log(JSON.stringify(jsonOutput, null, 2));

  } catch (error) {
    console.error('❌ Error testing API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  testUserApprovalAPI().then(() => process.exit(0));
}

export default testUserApprovalAPI;