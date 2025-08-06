const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const CoinActionConfig = require('../../dist/models/CoinActionConfig').default;

const SIMPLIFIED_COIN_ACTIONS = [
  // Tournament Management
  {
    action: 'create_tournament',
    name: 'Create Tournament',
    description: 'Create a new tournament in your club',
    category: 'tournament',
    cost: 50,
    requiredRole: 'club-organizer'
  },
  {
    action: 'generate_bracket',
    name: 'Generate Bracket',
    description: 'Generate tournament brackets and seeding',
    category: 'tournament',
    cost: 25,
    requiredRole: 'club-organizer'
  },
  {
    action: 'build_schedule',
    name: 'Build Schedule',
    description: 'Create and manage tournament schedules',
    category: 'tournament',
    cost: 30,
    requiredRole: 'club-organizer'
  },
  {
    action: 'export_tournament',
    name: 'Export Tournament',
    description: 'Export tournament data and reports',
    category: 'tournament',
    cost: 15,
    requiredRole: 'club-organizer'
  },

  // Player Management
  {
    action: 'add_player',
    name: 'Add Player',
    description: 'Add a new player to your club',
    category: 'player',
    cost: 2,
    requiredRole: 'club-organizer'
  },
  {
    action: 'bulk_import_players',
    name: 'Bulk Import Players',
    description: 'Import multiple players at once',
    category: 'player',
    cost: 20,
    requiredRole: 'club-admin'
  },
  {
    action: 'player_analytics',
    name: 'Player Analytics',
    description: 'View detailed player statistics and analytics',
    category: 'analytics',
    cost: 15,
    requiredRole: 'club-organizer'
  },

  // Live Operations
  {
    action: 'live_scoring',
    name: 'Live Scoring',
    description: 'Use live scoring system for matches',
    category: 'live_operations',
    cost: 5,
    requiredRole: 'player'
  },
  {
    action: 'match_update',
    name: 'Match Update',
    description: 'Update match scores and results',
    category: 'live_operations',
    cost: 3,
    requiredRole: 'player'
  },

  // Communication
  {
    action: 'email_notifications',
    name: 'Email Notifications',
    description: 'Send email notifications to players',
    category: 'communication',
    cost: 2,
    requiredRole: 'club-organizer'
  },
  {
    action: 'sms_notifications',
    name: 'SMS Notifications',
    description: 'Send SMS notifications to players',
    category: 'communication',
    cost: 10,
    requiredRole: 'club-organizer'
  },

  // Analytics & Reports
  {
    action: 'generate_reports',
    name: 'Generate Reports',
    description: 'Generate tournament and player reports',
    category: 'analytics',
    cost: 10,
    requiredRole: 'club-organizer'
  },
  {
    action: 'export_data',
    name: 'Export Data',
    description: 'Export tournament and player data',
    category: 'analytics',
    cost: 8,
    requiredRole: 'club-organizer'
  },
  {
    action: 'custom_analytics',
    name: 'Custom Analytics',
    description: 'Create custom analytics dashboards',
    category: 'analytics',
    cost: 20,
    requiredRole: 'club-admin'
  },

  // Administration
  {
    action: 'advanced_settings',
    name: 'Advanced Settings',
    description: 'Access advanced club settings',
    category: 'administration',
    cost: 5,
    requiredRole: 'club-admin'
  },
  {
    action: 'user_management',
    name: 'User Management',
    description: 'Manage club users and permissions',
    category: 'administration',
    cost: 10,
    requiredRole: 'club-admin'
  },

  // Free Actions (0 cost)
  {
    action: 'view_dashboard',
    name: 'View Dashboard',
    description: 'View club dashboard',
    category: 'administration',
    cost: 0,
    requiredRole: 'player'
  },
  {
    action: 'view_tournaments',
    name: 'View Tournaments',
    description: 'Browse tournaments',
    category: 'tournament',
    cost: 0,
    requiredRole: 'player'
  },
  {
    action: 'view_players',
    name: 'View Players',
    description: 'Browse players',
    category: 'player',
    cost: 0,
    requiredRole: 'player'
  }
];

async function initializeSimplifiedCoinActions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Clear existing coin action configs
    await CoinActionConfig.deleteMany({});
    console.log('🗑️  Cleared existing coin action configs');

    // Insert new simplified coin actions
    const insertedActions = await CoinActionConfig.insertMany(SIMPLIFIED_COIN_ACTIONS);
    console.log(`✅ Inserted ${insertedActions.length} simplified coin action configurations`);

    // Display summary
    console.log('\n📊 Simplified Coin Action Summary:');
    const categories = [...new Set(SIMPLIFIED_COIN_ACTIONS.map(action => action.category))];
    
    for (const category of categories) {
      const categoryActions = SIMPLIFIED_COIN_ACTIONS.filter(action => action.category === category);
      console.log(`\n${category.toUpperCase()}:`);
      categoryActions.forEach(action => {
        console.log(`  - ${action.name}: ${action.cost} coins`);
      });
    }

    console.log('\n🎉 Simplified coin action configurations initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing simplified coin actions:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
initializeSimplifiedCoinActions();