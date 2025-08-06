import mongoose from 'mongoose';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const listClubs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Get all clubs
    const clubs = await Club.find({}).sort({ createdAt: -1 });
    
    console.log(`\n🏢 Total clubs in database: ${clubs.length}\n`);
    
    if (clubs.length > 0) {
      console.log('🏢 Clubs list:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      clubs.forEach((club, index) => {
        console.log(`${index + 1}. **${club.name}**`);
        console.log(`   ID: ${club._id}`);
        console.log(`   Tier: ${club.subscription.tier}`);
        console.log(`   Max Tournaments: ${club.subscription.maxTournaments >= 999999 ? 'Unlimited' : club.subscription.maxTournaments}`);
        console.log(`   Max Players: ${club.subscription.maxPlayers >= 999999 ? 'Unlimited' : club.subscription.maxPlayers}`);
        console.log(`   Max Courts: ${club.subscription.maxCourts >= 999999 ? 'Unlimited' : club.subscription.maxCourts}`);
        console.log(`   Location: ${club.address?.street || 'No address'}`);
        console.log(`   Email: ${club.contactInfo.email}`);
        console.log(`   Phone: ${club.contactInfo.phone}`);
        console.log(`   Active: ${club.isActive ? 'Yes' : 'No'}`);
        console.log(`   Created: ${club.createdAt}`);
        console.log('   ─────────────────────────────────────────────────────────────────────────');
      });
    } else {
      console.log('❌ No clubs found in database');
    }

    // Show subscription statistics
    const stats = await Promise.all([
      Club.countDocuments({ 'subscription.tier': 'free' }),
      Club.countDocuments({ 'subscription.tier': 'premium' }),
      Club.countDocuments({ 'subscription.tier': 'enterprise' }),
      Club.countDocuments({ isActive: true })
    ]);

    console.log('\n📈 Subscription Statistics:');
    console.log(`   Free tier: ${stats[0]}`);
    console.log(`   Premium tier: ${stats[1]}`);
    console.log(`   Enterprise tier: ${stats[2]}`);
    console.log(`   Active clubs: ${stats[3]}`);

  } catch (error) {
    console.error('❌ Error listing clubs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  listClubs().then(() => process.exit(0));
}

export default listClubs;