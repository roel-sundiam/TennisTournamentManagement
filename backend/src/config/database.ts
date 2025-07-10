import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';
    
    console.log('🔄 Attempting to connect to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      connectTimeoutMS: 10000, // 10 seconds
      serverSelectionTimeoutMS: 5000, // 5 seconds
    });
    
    console.log(`🔗 MongoDB Connected: ${conn.connection.host}`);
    console.log(`🗄️  Database: ${conn.connection.name}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('📡 MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        console.log('🔒 MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during database disconnection:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
    
    // Don't exit the process, let the server start without DB
    console.log('⚠️  Server will start without database connection');
  }
};