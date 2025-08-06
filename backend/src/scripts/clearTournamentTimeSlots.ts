import mongoose from 'mongoose';
import dotenv from 'dotenv';
// Import all models to ensure they're registered
import '../models';

// Load environment variables
dotenv.config();

async function clearTournamentTimeSlots() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(MONGODB_URI);
    console.log('🔗 Connected to MongoDB');

    // Get models after connection
    const TimeSlot = mongoose.model('TimeSlot');
    const tournamentId = '68789d40b3820a4e4f5ce642';
    
    console.log(`🗑️ Clearing all time slots for tournament: ${tournamentId}`);

    // Delete all time slots for this tournament
    const result = await TimeSlot.deleteMany({ tournament: tournamentId });
    console.log(`✅ Deleted ${result.deletedCount} time slots`);

    // Also clear any duplicate null court time slots
    const duplicates = await TimeSlot.deleteMany({ 
      court: null,
      startTime: new Date(1753171200000),
      endTime: new Date(1753174800000)
    });
    console.log(`✅ Deleted ${duplicates.deletedCount} duplicate null court time slots`);

    console.log('🎉 Time slots cleared successfully!');

  } catch (error: any) {
    console.error('❌ Error clearing time slots:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📤 Disconnected from MongoDB');
  }
}

// Run the script
clearTournamentTimeSlots();