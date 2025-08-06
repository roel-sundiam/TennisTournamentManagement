const mongoose = require('mongoose');
require('dotenv').config();

async function testScheduleCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878cf2c44caf53ff8b489ec';
    
    console.log('\n=== TESTING SCHEDULE CREATION ===');
    
    // Test creating a schedule manually to see if it works
    const testSchedule = {
      tournament: new mongoose.Types.ObjectId(tournamentId),
      date: new Date('2025-07-25'), // Tomorrow
      startTime: '18:00', // 6 PM
      endTime: '22:00',   // 10 PM
      courts: ['Court 1', 'Court 2'], 
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Creating test schedule:', testSchedule);
    
    const result = await db.collection('schedules').insertOne(testSchedule);
    console.log('✅ Schedule created with ID:', result.insertedId);
    
    // Now try to create time slots based on this schedule
    console.log('\n=== CREATING TIME SLOTS ===');
    
    const timeSlots = [];
    const startHour = 18; // 6 PM
    const endHour = 22;   // 10 PM
    const matchDuration = 60; // 60 minutes per match
    
    const scheduleDate = new Date('2025-07-25');
    
    for (const court of testSchedule.courts) {
      for (let hour = startHour; hour < endHour; hour += (matchDuration / 60)) {
        const slotStart = new Date(scheduleDate);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
        
        const timeSlot = {
          tournament: new mongoose.Types.ObjectId(tournamentId),
          court: court,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          match: null,
          createdAt: new Date()
        };
        
        timeSlots.push(timeSlot);
      }
    }
    
    console.log(`Creating ${timeSlots.length} time slots...`);
    
    if (timeSlots.length > 0) {
      const slotResults = await db.collection('timeslots').insertMany(timeSlots);
      console.log(`✅ Created ${slotResults.insertedCount} time slots`);
      
      // Show first few time slots
      timeSlots.slice(0, 4).forEach((slot, i) => {
        console.log(`  Slot ${i + 1}: ${slot.court} ${slot.startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} - ${slot.endTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
      });
    }
    
    // Now assign matches to time slots
    console.log('\n=== ASSIGNING MATCHES TO SLOTS ===');
    
    const { Match } = require('./dist/models/index');
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1 
    }).sort({ matchNumber: 1 });
    
    console.log(`Found ${round1Matches.length} Round 1 matches to schedule`);
    
    // Assign first 4 time slots to Round 1 matches
    const availableSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      isAvailable: true 
    }).sort({ startTime: 1 }).limit(4).toArray();
    
    console.log(`Found ${availableSlots.length} available time slots`);
    
    for (let i = 0; i < Math.min(round1Matches.length, availableSlots.length); i++) {
      const match = round1Matches[i];
      const slot = availableSlots[i];
      
      // Update match with scheduled time
      await Match.updateOne(
        { _id: match._id },
        { 
          scheduledDateTime: slot.startTime,
          status: 'scheduled'
        }
      );
      
      // Update time slot as assigned
      await db.collection('timeslots').updateOne(
        { _id: slot._id },
        { 
          $set: { 
            match: match._id,
            isAvailable: false 
          }
        }
      );
      
      console.log(`✅ Assigned Match ${match.matchNumber} to ${slot.court} at ${slot.startTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
    }
    
    console.log('\n🎯 MANUAL SCHEDULE CREATION COMPLETE!');
    console.log('Check the UI now - matches should be visible with proper times.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testScheduleCreation();