import mongoose from 'mongoose';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const addEliteClub = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Check if Elite Tennis Center already exists
    const existingClub = await Club.findOne({ name: 'Elite Tennis Center' });
    if (existingClub) {
      console.log('Elite Tennis Center already exists');
      return;
    }

    // Create Elite Tennis Center
    const eliteClub = await Club.create({
      name: 'Elite Tennis Center',
      description: 'High-end tennis facility with professional tournaments and corporate events.',
      address: {
        street: '789 Championship Drive',
        city: 'Elite Hills',
        state: 'Florida',
        zipCode: '33101',
        country: 'USA'
      },
      contactInfo: {
        email: 'admin@elitetenniscenter.com',
        phone: '+1-555-354835',
        website: 'https://elitetenniscenter.com'
      },
      settings: {
        timezone: 'America/New_York',
        currency: 'USD',
        language: 'en',
        dateFormat: 'MM/DD/YYYY'
      },
      branding: {
        primaryColor: '#9c27b0',
        secondaryColor: '#ffc107',
        logoUrl: 'https://example.com/elite-logo.png'
      },
      subscription: {
        tier: 'enterprise',
        maxTournaments: 999999, // unlimited
        maxPlayers: 999999, // unlimited
        maxCourts: 999999, // unlimited
        features: [
          'basic-tournaments', 'advanced-scheduling', 'live-scoring', 
          'statistics', 'custom-branding', 'api-access', 'priority-support',
          'multiple-admins', 'advanced-reports', 'integrations'
        ],
        isActive: true
      },
      adminUsers: [],
      isActive: true
    });

    console.log(`✅ Created club: ${eliteClub.name} (${eliteClub.subscription.tier} tier)`);
    console.log(`   ID: ${eliteClub._id}`);
    console.log(`   Max Tournaments: Unlimited`);
    console.log(`   Max Players: Unlimited`);
    console.log(`   Location: ${eliteClub.address?.street || 'No address'}`);

  } catch (error) {
    console.error('❌ Error creating Elite Tennis Center:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  addEliteClub().then(() => process.exit(0));
}

export default addEliteClub;