const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const CoinActionConfig = require('../../dist/models/CoinActionConfig').default;

async function testCoinActions() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Test: Get all coin actions
    console.log('\n📋 All coin actions in database:');
    const allActions = await CoinActionConfig.find({});
    console.log(`Found ${allActions.length} coin actions`);
    
    for (const action of allActions) {
      console.log(`  - ${action.action}: ${action.cost} coins (${action.name})`);
    }

    // Test: Get specific action cost using static method
    console.log('\n🎯 Testing getCost static method:');
    const addPlayerCost = await CoinActionConfig.getCost('add_player');
    console.log(`add_player cost: ${addPlayerCost} coins`);

    const createTournamentCost = await CoinActionConfig.getCost('create_tournament');
    console.log(`create_tournament cost: ${createTournamentCost} coins`);

    const generateBracketCost = await CoinActionConfig.getCost('generate_bracket');
    console.log(`generate_bracket cost: ${generateBracketCost} coins`);

    const buildScheduleCost = await CoinActionConfig.getCost('build_schedule');
    console.log(`build_schedule cost: ${buildScheduleCost} coins`);

    const liveScoringCost = await CoinActionConfig.getCost('live_scoring');
    console.log(`live_scoring cost: ${liveScoringCost} coins`);

    // Test: Check if actions exist
    console.log('\n🔍 Testing direct queries:');
    const addPlayerAction = await CoinActionConfig.findOne({ action: 'add_player', enabled: true });
    console.log('add_player action found:', addPlayerAction ? `Yes (${addPlayerAction.cost} coins)` : 'No');

    const createTournamentAction = await CoinActionConfig.findOne({ action: 'create_tournament', enabled: true });
    console.log('create_tournament action found:', createTournamentAction ? `Yes (${createTournamentAction.cost} coins)` : 'No');

    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing coin actions:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
testCoinActions();