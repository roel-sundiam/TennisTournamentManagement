import mongoose from 'mongoose';
import Club from '../models/Club';
import { config } from 'dotenv';

// Load environment variables
config();

const createSampleClubs = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Check if clubs already exist
    const existingClubs = await Club.find({});
    if (existingClubs.length > 0) {
      console.log(`Found ${existingClubs.length} existing clubs:`);
      existingClubs.forEach(club => {
        console.log(`- ${club.name} (${club.subscription.tier})`);
      });
      return;
    }

    // Create sample clubs
    const sampleClubs = [
      {
        name: 'Metro Tennis Club',
        description: 'Premier tennis facility in downtown Metro City with 8 courts and professional coaching.',
        address: {
          street: '123 Tennis Lane',
          city: 'Metro City',
          state: 'California',
          zipCode: '90210',
          country: 'USA'
        },
        contactInfo: {
          email: 'info@metrotennisclub.com',
          phone: '+1-555-836647',
          website: 'https://metrotennisclub.com'
        },
        settings: {
          timezone: 'America/Los_Angeles',
          currency: 'USD',
          language: 'en',
          dateFormat: 'MM/DD/YYYY'
        },
        branding: {
          primaryColor: '#1976d2',
          secondaryColor: '#ff5722',
          logoUrl: 'https://example.com/metro-logo.png'
        },
        subscription: {
          tier: 'premium',
          maxTournaments: 25,
          maxPlayers: 500,
          maxCourts: 20,
          features: ['basic-tournaments', 'advanced-scheduling', 'live-scoring', 'statistics', 'custom-branding'],
          isActive: true
        },
        adminUsers: [],
        isActive: true
      },
      {
        name: 'Riverside Tennis Academy',
        description: 'Youth-focused tennis academy specializing in junior development and training programs.',
        address: {
          street: '456 River Road',
          city: 'Riverside',
          state: 'Texas',
          zipCode: '78701',
          country: 'USA'
        },
        contactInfo: {
          email: 'contact@riversidetennisacademy.com',
          phone: '+1-555-586467',
          website: 'https://riversidetennisacademy.com'
        },
        settings: {
          timezone: 'America/Chicago',
          currency: 'USD',
          language: 'en',
          dateFormat: 'MM/DD/YYYY'
        },
        branding: {
          primaryColor: '#4caf50',
          secondaryColor: '#ff9800',
          logoUrl: 'https://example.com/riverside-logo.png'
        },
        subscription: {
          tier: 'free',
          maxTournaments: 5,
          maxPlayers: 100,
          maxCourts: 5,
          features: ['basic-tournaments'],
          isActive: true
        },
        adminUsers: [],
        isActive: true
      },
      {
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
          maxTournaments: 999999, // unlimited (large number)
          maxPlayers: 999999, // unlimited (large number)
          maxCourts: 999999, // unlimited (large number)
          features: [
            'basic-tournaments', 'advanced-scheduling', 'live-scoring', 
            'statistics', 'custom-branding', 'api-access', 'priority-support',
            'multiple-admins', 'advanced-reports', 'integrations'
          ],
          isActive: true
        },
        adminUsers: [],
        isActive: true
      }
    ];

    console.log('Creating sample clubs...');
    
    for (const clubData of sampleClubs) {
      const club = await Club.create(clubData);
      console.log(`✅ Created club: ${club.name} (${club.subscription.tier} tier)`);
      console.log(`   ID: ${club._id}`);
      console.log(`   Max Tournaments: ${club.subscription.maxTournaments >= 999999 ? 'Unlimited' : club.subscription.maxTournaments}`);
      console.log(`   Max Players: ${club.subscription.maxPlayers >= 999999 ? 'Unlimited' : club.subscription.maxPlayers}`);
      console.log('   ─────────────────────────────────────────────────────');
    }

    console.log('\n📊 Club Statistics:');
    const stats = await Promise.all([
      Club.countDocuments({ 'subscription.tier': 'free' }),
      Club.countDocuments({ 'subscription.tier': 'premium' }),
      Club.countDocuments({ 'subscription.tier': 'enterprise' }),
      Club.countDocuments({ isActive: true })
    ]);

    console.log(`   Free tier: ${stats[0]}`);
    console.log(`   Premium tier: ${stats[1]}`);
    console.log(`   Enterprise tier: ${stats[2]}`);
    console.log(`   Active clubs: ${stats[3]}`);

  } catch (error) {
    console.error('❌ Error creating clubs:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  createSampleClubs().then(() => process.exit(0));
}

export default createSampleClubs;