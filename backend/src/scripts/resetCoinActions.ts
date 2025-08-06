import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function resetCoinActions() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Drop the entire collection to remove old indexes
    console.log('🗑️ Dropping coinactionconfigs collection...');
    await mongoose.connection.db?.dropCollection('coinactionconfigs');
    console.log('✅ Collection dropped successfully');

  } catch (error: any) {
    if (error?.message?.includes('ns not found')) {
      console.log('✅ Collection did not exist, continuing...');
    } else {
      console.error('❌ Error dropping collection:', error);
    }
  } finally {
    console.log('🔌 Closing database connection...');
    await mongoose.connection.close();
  }
}

resetCoinActions();