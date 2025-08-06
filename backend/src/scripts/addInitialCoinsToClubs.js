const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Club = require('../../dist/models/Club').default;
const CoinTransaction = require('../../dist/models/CoinTransaction').default;
const User = require('../../dist/models/User').default;

async function addInitialCoinsToClubs() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Find all clubs
    const clubs = await Club.find({});
    console.log(`📋 Found ${clubs.length} clubs`);

    // Find super admin user for transaction logging
    const superAdmin = await User.findOne({ role: 'super-admin' });
    
    if (!superAdmin) {
      console.log('❌ No super-admin user found. Creating transactions without user reference.');
    } else {
      console.log(`✅ Found super-admin: ${superAdmin.username}`);
    }

    // Add 1000 coins to each club that has less than 100 coins
    for (const club of clubs) {
      const currentBalance = club.coinBalance || 0;
      
      if (currentBalance < 100) {
        const coinsToAdd = 1000;
        
        // Update club balance
        club.coinBalance = coinsToAdd;
        await club.save();
        
        // Create transaction record
        const transaction = new CoinTransaction({
          club: club._id,
          user: superAdmin ? superAdmin._id : null,
          type: 'credit',
          amount: coinsToAdd,
          reason: 'initial_grant',
          description: `Initial coin grant for new club: ${club.name}`,
          balanceAfter: club.coinBalance,
          metadata: {
            initialGrant: true,
            scriptGenerated: true
          }
        });
        
        await transaction.save();
        
        console.log(`💰 Added ${coinsToAdd} coins to ${club.name} (Balance: ${club.coinBalance})`);
      } else {
        console.log(`✅ ${club.name} already has sufficient coins (${currentBalance})`);
      }
    }

    console.log('\n🎉 Initial coin distribution completed!');
    
  } catch (error) {
    console.error('❌ Error adding initial coins:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
addInitialCoinsToClubs();