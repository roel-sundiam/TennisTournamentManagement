import mongoose from 'mongoose';
import { config } from 'dotenv';

config();

async function clearDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');
    
    // Drop all collections
    const collections = await mongoose.connection.db!.listCollections().toArray();
    for (const collection of collections) {
      await mongoose.connection.db!.dropCollection(collection.name);
      console.log('✅ Dropped collection:', collection.name);
    }
    
    console.log('✅ All collections cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

clearDatabase();