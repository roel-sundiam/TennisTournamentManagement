import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CoinActionConfig from '../models/CoinActionConfig';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function updateCoinActionsToFlat() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing configurations
    console.log('🗑️  Clearing existing coin action configs...');
    await CoinActionConfig.deleteMany({});

    // Define simplified coin actions with flat rates
    const coinActions = [
      // Tournament Management
      { action: 'create_tournament', name: 'Create Tournament', description: 'Create a new tournament', category: 'tournament', cost: 50, requiredRole: 'club-organizer', enabled: true },
      { action: 'generate_brackets', name: 'Generate Brackets', description: 'Generate tournament brackets', category: 'tournament', cost: 25, requiredRole: 'club-organizer', enabled: true },
      { action: 'schedule_builder', name: 'Schedule Builder', description: 'Build match schedules', category: 'tournament', cost: 30, requiredRole: 'club-organizer', enabled: true },
      { action: 'export_tournament', name: 'Export Tournament', description: 'Export tournament data', category: 'tournament', cost: 15, requiredRole: 'club-organizer', enabled: true },
      { action: 'view_tournaments', name: 'View Tournaments', description: 'View tournament listings', category: 'tournament', cost: 0, requiredRole: 'player', enabled: true },

      // Player Management  
      { action: 'add_player', name: 'Add Player', description: 'Add a new player to the club', category: 'player', cost: 2, requiredRole: 'club-organizer', enabled: true },
      { action: 'bulk_import_players', name: 'Bulk Import Players', description: 'Import multiple players from file', category: 'player', cost: 20, requiredRole: 'club-admin', enabled: true },
      { action: 'view_players', name: 'View Players', description: 'View player listings', category: 'player', cost: 0, requiredRole: 'player', enabled: true },

      // Live Operations
      { action: 'live_scoring', name: 'Live Scoring', description: 'Update live match scores', category: 'live_operations', cost: 5, requiredRole: 'club-organizer', enabled: true },
      { action: 'match_update', name: 'Match Update', description: 'Update match information', category: 'live_operations', cost: 3, requiredRole: 'club-organizer', enabled: true },

      // Analytics & Reports
      { action: 'player_analytics', name: 'Player Analytics', description: 'Generate player performance analytics', category: 'analytics', cost: 15, requiredRole: 'club-organizer', enabled: true },
      { action: 'generate_reports', name: 'Generate Reports', description: 'Generate tournament reports', category: 'analytics', cost: 10, requiredRole: 'club-organizer', enabled: true },
      { action: 'export_data', name: 'Export Data', description: 'Export data to various formats', category: 'analytics', cost: 8, requiredRole: 'club-organizer', enabled: true },
      { action: 'custom_analytics', name: 'Custom Analytics', description: 'Generate custom analytics reports', category: 'analytics', cost: 20, requiredRole: 'club-admin', enabled: true },

      // Communication
      { action: 'email_notifications', name: 'Email Notifications', description: 'Send email notifications', category: 'communication', cost: 2, requiredRole: 'club-organizer', enabled: true },
      { action: 'sms_notifications', name: 'SMS Notifications', description: 'Send SMS notifications', category: 'communication', cost: 10, requiredRole: 'club-organizer', enabled: true },

      // Administration
      { action: 'advanced_settings', name: 'Advanced Settings', description: 'Access advanced club settings', category: 'administration', cost: 5, requiredRole: 'club-admin', enabled: true },
      { action: 'user_management', name: 'User Management', description: 'Manage club users and permissions', category: 'administration', cost: 10, requiredRole: 'club-admin', enabled: true },
      { action: 'view_dashboard', name: 'View Dashboard', description: 'View club dashboard', category: 'administration', cost: 0, requiredRole: 'player', enabled: true },
    ];

    // Insert new flat-rate configurations
    console.log('✅ Inserting new flat-rate coin action configurations...');
    await CoinActionConfig.insertMany(coinActions);

    console.log('\n📊 Updated Coin Action Summary (Flat Rates):');
    console.log('\nTOURNAMENT:');
    console.log('  - Create Tournament: 50 coins');
    console.log('  - Generate Brackets: 25 coins');
    console.log('  - Schedule Builder: 30 coins');
    console.log('  - Export Tournament: 15 coins');
    console.log('  - View Tournaments: FREE');

    console.log('\nPLAYER:');
    console.log('  - Add Player: 2 coins');
    console.log('  - Bulk Import Players: 20 coins');
    console.log('  - View Players: FREE');

    console.log('\nLIVE OPERATIONS:');
    console.log('  - Live Scoring: 5 coins');
    console.log('  - Match Update: 3 coins');

    console.log('\nANALYTICS:');
    console.log('  - Player Analytics: 15 coins');
    console.log('  - Generate Reports: 10 coins');
    console.log('  - Export Data: 8 coins');
    console.log('  - Custom Analytics: 20 coins');

    console.log('\nCOMMUNICATION:');
    console.log('  - Email Notifications: 2 coins');
    console.log('  - SMS Notifications: 10 coins');

    console.log('\nADMINISTRATION:');
    console.log('  - Advanced Settings: 5 coins');
    console.log('  - User Management: 10 coins');
    console.log('  - View Dashboard: FREE');

    console.log('\n🎉 Coin system simplified to flat rates successfully!');
    console.log(`✅ Total actions configured: ${coinActions.length}`);

  } catch (error) {
    console.error('❌ Error updating coin actions:', error);
  } finally {
    console.log('🔌 Closing database connection...');
    await mongoose.connection.close();
  }
}

updateCoinActionsToFlat();