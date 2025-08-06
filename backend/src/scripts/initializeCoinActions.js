const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const CoinActionConfig = require('../../dist/models/CoinActionConfig').default;

const DEFAULT_COIN_ACTIONS = [
  // Tournament Management
  {
    actionKey: 'create_tournament',
    displayName: 'Create Tournament',
    description: 'Create a new tournament in your club',
    category: 'tournament',
    baseCost: 50,
    tierCosts: { free: 50, premium: 40, enterprise: 30 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'generate_brackets',
    displayName: 'Generate Brackets',
    description: 'Generate tournament brackets and seeding',
    category: 'tournament',
    baseCost: 25,
    tierCosts: { free: 25, premium: 20, enterprise: 15 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'schedule_builder',
    displayName: 'Schedule Builder',
    description: 'Create and manage tournament schedules',
    category: 'tournament',
    baseCost: 30,
    tierCosts: { free: 30, premium: 25, enterprise: 20 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'export_tournament',
    displayName: 'Export Tournament',
    description: 'Export tournament data and reports',
    category: 'tournament',
    baseCost: 15,
    tierCosts: { free: 15, premium: 12, enterprise: 10 },
    minimumRole: 'club-organizer'
  },

  // Player Management
  {
    actionKey: 'add_player',
    displayName: 'Add Player',
    description: 'Add a new player to your club',
    category: 'player',
    baseCost: 2,
    tierCosts: { free: 2, premium: 2, enterprise: 1 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'bulk_import_players',
    displayName: 'Bulk Import Players',
    description: 'Import multiple players at once',
    category: 'player',
    baseCost: 20,
    tierCosts: { free: 20, premium: 15, enterprise: 10 },
    minimumRole: 'club-admin'
  },
  {
    actionKey: 'player_analytics',
    displayName: 'Player Analytics',
    description: 'View detailed player statistics and analytics',
    category: 'analytics',
    baseCost: 15,
    tierCosts: { free: 15, premium: 12, enterprise: 8 },
    minimumRole: 'club-organizer'
  },

  // Live Operations
  {
    actionKey: 'live_scoring',
    displayName: 'Live Scoring',
    description: 'Use live scoring system for matches',
    category: 'live_operations',
    baseCost: 5,
    tierCosts: { free: 5, premium: 4, enterprise: 3 },
    minimumRole: 'player'
  },
  {
    actionKey: 'match_update',
    displayName: 'Match Update',
    description: 'Update match scores and results',
    category: 'live_operations',
    baseCost: 3,
    tierCosts: { free: 3, premium: 2, enterprise: 2 },
    minimumRole: 'player'
  },

  // Communication
  {
    actionKey: 'email_notifications',
    displayName: 'Email Notifications',
    description: 'Send email notifications to players',
    category: 'communication',
    baseCost: 2,
    tierCosts: { free: 2, premium: 1, enterprise: 1 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'sms_notifications',
    displayName: 'SMS Notifications',
    description: 'Send SMS notifications to players',
    category: 'communication',
    baseCost: 10,
    tierCosts: { free: 10, premium: 8, enterprise: 6 },
    minimumRole: 'club-organizer'
  },

  // Analytics & Reports
  {
    actionKey: 'generate_reports',
    displayName: 'Generate Reports',
    description: 'Generate tournament and player reports',
    category: 'analytics',
    baseCost: 10,
    tierCosts: { free: 10, premium: 8, enterprise: 5 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'export_data',
    displayName: 'Export Data',
    description: 'Export tournament and player data',
    category: 'analytics',
    baseCost: 8,
    tierCosts: { free: 8, premium: 6, enterprise: 4 },
    minimumRole: 'club-organizer'
  },
  {
    actionKey: 'custom_analytics',
    displayName: 'Custom Analytics',
    description: 'Create custom analytics dashboards',
    category: 'analytics',
    baseCost: 20,
    tierCosts: { free: 20, premium: 15, enterprise: 10 },
    minimumRole: 'club-admin'
  },

  // Administration
  {
    actionKey: 'advanced_settings',
    displayName: 'Advanced Settings',
    description: 'Access advanced club settings',
    category: 'administration',
    baseCost: 5,
    tierCosts: { free: 5, premium: 0, enterprise: 0 },
    minimumRole: 'club-admin'
  },
  {
    actionKey: 'user_management',
    displayName: 'User Management',
    description: 'Manage club users and permissions',
    category: 'administration',
    baseCost: 10,
    tierCosts: { free: 10, premium: 5, enterprise: 0 },
    minimumRole: 'club-admin'
  },

  // Free Actions (0 cost)
  {
    actionKey: 'view_dashboard',
    displayName: 'View Dashboard',
    description: 'View club dashboard',
    category: 'administration',
    baseCost: 0,
    tierCosts: { free: 0, premium: 0, enterprise: 0 },
    minimumRole: 'player'
  },
  {
    actionKey: 'view_tournaments',
    displayName: 'View Tournaments',
    description: 'Browse tournaments',
    category: 'tournament',
    baseCost: 0,
    tierCosts: { free: 0, premium: 0, enterprise: 0 },
    minimumRole: 'player'
  },
  {
    actionKey: 'view_players',
    displayName: 'View Players',
    description: 'Browse players',
    category: 'player',
    baseCost: 0,
    tierCosts: { free: 0, premium: 0, enterprise: 0 },
    minimumRole: 'player'
  }
];

async function initializeCoinActions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Clear existing coin action configs
    await CoinActionConfig.deleteMany({});
    console.log('🗑️  Cleared existing coin action configs');

    // Insert default coin actions
    const insertedActions = await CoinActionConfig.insertMany(DEFAULT_COIN_ACTIONS);
    console.log(`✅ Inserted ${insertedActions.length} coin action configurations`);

    // Display summary
    console.log('\n📊 Coin Action Summary:');
    const categories = [...new Set(DEFAULT_COIN_ACTIONS.map(action => action.category))];
    
    for (const category of categories) {
      const categoryActions = DEFAULT_COIN_ACTIONS.filter(action => action.category === category);
      console.log(`\n${category.toUpperCase()}:`);
      categoryActions.forEach(action => {
        console.log(`  - ${action.displayName}: ${action.tierCosts.free}/${action.tierCosts.premium}/${action.tierCosts.enterprise} coins (Free/Premium/Enterprise)`);
      });
    }

    console.log('\n🎉 Coin action configurations initialized successfully!');
    
  } catch (error) {
    console.error('❌ Error initializing coin actions:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
initializeCoinActions();