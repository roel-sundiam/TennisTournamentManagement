const mongoose = require('mongoose');
require('dotenv').config();

async function checkAllTimeSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Check ALL time slots in database
    const db = mongoose.connection.db;
    const allSlots = await db.collection('timeslots').find({}).toArray();
    
    console.log('📊 Total time slots in database:', allSlots.length);
    
    if (allSlots.length > 0) {
      console.log('🔍 First 5 time slots:');
      allSlots.slice(0, 5).forEach((slot, index) => {
        console.log(`  ${index + 1}. Court: ${slot.court}, Tournament: ${slot.tournament}, Time: ${new Date(slot.startTime).toLocaleString()}`);
      });
      
      // Check for our specific tournament
      const tournamentId = '6879c294b64b6d92bcfeeb6e';
      const ourSlots = allSlots.filter(slot => slot.tournament.toString() === tournamentId);
      console.log(`🎾 Time slots for tournament ${tournamentId}:`, ourSlots.length);
      
      if (ourSlots.length > 0) {
        console.log('🔍 Our tournament time slots:');
        ourSlots.forEach((slot, index) => {
          console.log(`  ${index + 1}. Court: ${slot.court}, Time: ${new Date(slot.startTime).toLocaleString()}`);
        });
      }
      
      // Check for conflicts with generated time slots
      const startTime = new Date(1753524000000); // The conflicting timestamp
      const conflictingSlots = allSlots.filter(slot => 
        slot.startTime.getTime() === startTime.getTime() && 
        slot.court === 'Court 1'
      );
      
      console.log(`🚨 Conflicting time slots (${startTime.toLocaleString()}):`, conflictingSlots.length);
      if (conflictingSlots.length > 0) {
        conflictingSlots.forEach((slot, index) => {
          console.log(`  ${index + 1}. Tournament: ${slot.tournament}, Court: ${slot.court}, Time: ${new Date(slot.startTime).toLocaleString()}`);
        });
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllTimeSlots();