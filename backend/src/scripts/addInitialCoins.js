const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const Club = require('../../dist/models/Club').default;
const CoinTransaction = require('../../dist/models/CoinTransaction').default;

async function addInitialCoins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement');
    console.log('🔗 Connected to MongoDB');

    // Get all clubs
    const clubs = await Club.find({ isActive: true });
    console.log(`📋 Found ${clubs.length} active clubs`);

    for (const club of clubs) {
      console.log(`\n🏢 Processing club: ${club.name} (${club.subscription.tier})`);
      
      // Set initial coin balance based on subscription tier
      let initialCoins = 0;
      let monthlyAllocation = 0;
      
      switch (club.subscription.tier) {
        case 'free':
          initialCoins = 200;
          monthlyAllocation = 200;
          break;
        case 'premium':
          initialCoins = 1000;
          monthlyAllocation = 1000;
          break;
        case 'enterprise':
          initialCoins = 5000;
          monthlyAllocation = 5000;
          break;
      }

      // Update club with initial coins
      const previousBalance = club.coinBalance || 0;
      club.coinBalance = initialCoins;
      club.coinSettings = {
        ...club.coinSettings,
        monthlyAllocation: monthlyAllocation,
        lastAllocation: new Date(),
        spendingLimits: {
          dailyLimit: 1000,
          monthlyLimit: 5000,
          singleActionLimit: 100
        }
      };
      
      await club.save();

      // Create initial coin transaction record
      if (club.adminUsers && club.adminUsers.length > 0) {
        const transaction = new CoinTransaction({
          club: club._id,
          user: club.adminUsers[0], // Use first admin user
          amount: initialCoins,
          type: 'credit',
          action: 'initial_allocation',
          description: `Initial coin allocation for ${club.subscription.tier} tier`,
          balanceAfter: initialCoins
        });

        await transaction.save();
        console.log(`✅ Added ${initialCoins} coins to ${club.name}`);
      } else {
        console.log(`⚠️  No admin users found for ${club.name}, skipping transaction record`);
      }
    }

    console.log('\n🎉 Initial coin allocation completed successfully!');
    console.log('\n📊 Club Coin Summary:');
    
    const updatedClubs = await Club.find({ isActive: true });
    updatedClubs.forEach(club => {
      console.log(`  - ${club.name} (${club.subscription.tier}): ${club.coinBalance} coins`);
    });

  } catch (error) {
    console.error('❌ Error adding initial coins:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
addInitialCoins();