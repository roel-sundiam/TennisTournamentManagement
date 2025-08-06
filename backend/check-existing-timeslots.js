const mongoose = require('mongoose');
require('dotenv').config();

async function checkExistingTimeSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    
    // Check existing time slots
    const TimeSlot = mongoose.model('TimeSlot', new mongoose.Schema({}, {strict: false}));
    const existingSlots = await TimeSlot.find({ tournament: tournamentId });
    
    console.log('📊 Existing time slots for tournament:', existingSlots.length);
    
    if (existingSlots.length > 0) {
      console.log('🔍 First few existing time slots:');
      existingSlots.slice(0, 5).forEach((slot, index) => {
        console.log(`  ${index + 1}. ${slot.court} - ${slot.startTime.toLocaleString()} to ${slot.endTime.toLocaleString()}`);
      });
      
      // Delete all existing time slots for this tournament
      console.log('\n🧹 Deleting all existing time slots...');
      const deleteResult = await TimeSlot.deleteMany({ tournament: tournamentId });
      console.log('✅ Deleted:', deleteResult.deletedCount, 'time slots');
    }
    
    // Check existing schedules
    const Schedule = mongoose.model('Schedule', new mongoose.Schema({}, {strict: false}));
    const existingSchedules = await Schedule.find({ tournament: tournamentId });
    
    console.log('📊 Existing schedules for tournament:', existingSchedules.length);
    
    if (existingSchedules.length > 0) {
      console.log('🧹 Deleting all existing schedules...');
      const deleteResult = await Schedule.deleteMany({ tournament: tournamentId });
      console.log('✅ Deleted:', deleteResult.deletedCount, 'schedules');
    }
    
    console.log('✅ Cleanup completed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkExistingTimeSlots();