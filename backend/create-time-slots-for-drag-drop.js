const mongoose = require('mongoose');
require('dotenv').config();

async function createTimeSlotsForDragDrop() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Match = require('./dist/models/Match').default;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🎯 CREATING TIME SLOTS FOR DRAG & DROP');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Clean up any existing time slots to start fresh
    const db = mongoose.connection.db;
    await db.collection('timeslots').deleteMany({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    console.log('🧹 Cleaned up existing time slots');
    
    // Get all matches with scheduled times
    const matches = await Match.find({ 
      tournament: tournamentId,
      scheduledDateTime: { $ne: null }
    }).sort({ round: 1, matchNumber: 1 });
    
    console.log(`Found ${matches.length} matches with scheduled times`);
    
    if (matches.length === 0) {
      console.log('❌ No scheduled matches found');
      return;
    }
    
    // Create time slots based on the scheduled matches
    const timeSlots = [];
    
    matches.forEach((match, index) => {
      const startTime = new Date(match.scheduledDateTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60); // 1 hour duration
      
      // Calculate duration in minutes
      const durationMinutes = (endTime - startTime) / (1000 * 60);
      
      const timeSlot = {
        tournament: new mongoose.Types.ObjectId(tournamentId),
        startTime: startTime,
        endTime: endTime,
        court: `Court ${(index % 2) + 1}`, // Alternate between Court 1 and Court 2
        status: 'booked', // Mark as booked since it has a match
        duration: durationMinutes,
        match: match._id,
        notes: `Round ${match.round} Match ${match.matchNumber}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      timeSlots.push(timeSlot);
    });
    
    // Also create some additional available slots for flexibility
    const baseDate = new Date(matches[0].scheduledDateTime);
    const additionalSlots = [
      { hour: 17, minute: 0 }, // 5:00 PM
      { hour: 22, minute: 0 }, // 10:00 PM
    ];
    
    additionalSlots.forEach((slot, index) => {
      const startTime = new Date(baseDate);
      startTime.setHours(slot.hour, slot.minute, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60);
      
      const durationMinutes = (endTime - startTime) / (1000 * 60);
      
      const timeSlot = {
        tournament: new mongoose.Types.ObjectId(tournamentId),
        startTime: startTime,
        endTime: endTime,
        court: `Court ${(index % 2) + 1}`,
        status: 'available', // Available for drag & drop
        duration: durationMinutes,
        match: null,
        notes: 'Available time slot',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      timeSlots.push(timeSlot);
    });
    
    // Insert all time slots
    await db.collection('timeslots').insertMany(timeSlots);
    console.log(`⏰ Created ${timeSlots.length} time slots`);
    
    // Display what was created
    console.log('\n📅 Time Slots Created:');
    timeSlots.forEach((slot, i) => {
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      const status = slot.match ? 'BOOKED' : 'AVAILABLE';
      console.log(`  ${i + 1}. ${slot.court}: ${timeDisplay} - ${status}`);
      if (slot.match) {
        console.log(`      ↳ ${slot.notes}`);
      }
    });
    
    console.log('\n🎯 DRAG & DROP TIME SLOTS READY!');
    console.log('✅ Go to Drag & Drop Schedule tab to see the time slots');
    console.log('✅ You can now drag matches between time slots');
    console.log('✅ Available slots are ready for new match assignments');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createTimeSlotsForDragDrop();