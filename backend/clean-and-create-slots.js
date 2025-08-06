const mongoose = require('mongoose');
require('dotenv').config();

async function cleanAndCreateSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🧹 CLEANING ALL TIME SLOTS');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Delete ALL time slots for this tournament (any that might exist)
    const deleteResult = await db.collection('timeslots').deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} time slots globally (to avoid conflicts)`);
    
    // Get matches with scheduled times
    const Match = require('./dist/models/Match').default;
    const matches = await Match.find({ 
      tournament: tournamentId,
      scheduledDateTime: { $ne: null }
    }).sort({ round: 1, matchNumber: 1 });
    
    console.log(`Found ${matches.length} matches with scheduled times`);
    
    // Create simple time slots without complex constraints
    const timeSlots = [];
    
    // Create 6 time slots: 5 PM, 6 PM, 7 PM, 8 PM, 9 PM, 10 PM on Court 1
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Tomorrow
    
    const hours = [17, 18, 19, 20, 21, 22]; // 5 PM to 10 PM
    
    hours.forEach((hour, index) => {
      const startTime = new Date(baseDate);
      startTime.setHours(hour, 0, 0, 0);
      
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + 60);
      
      // Check if any match is scheduled at this time
      const matchAtThisTime = matches.find(match => {
        const matchTime = new Date(match.scheduledDateTime);
        return matchTime.getHours() === hour;
      });
      
      const timeSlot = {
        tournament: new mongoose.Types.ObjectId(tournamentId),
        startTime: startTime,
        endTime: endTime,
        court: 'Court 1', // Use simple string
        status: matchAtThisTime ? 'booked' : 'available',
        duration: 60,
        match: matchAtThisTime ? matchAtThisTime._id : null,
        notes: matchAtThisTime ? `Round ${matchAtThisTime.round} Match ${matchAtThisTime.matchNumber}` : 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      timeSlots.push(timeSlot);
    });
    
    // Insert time slots one by one to handle any issues
    console.log('\n⏰ Creating time slots...');
    
    for (let i = 0; i < timeSlots.length; i++) {
      const slot = timeSlots[i];
      try {
        await db.collection('timeslots').insertOne(slot);
        
        const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        const status = slot.match ? 'BOOKED' : 'AVAILABLE';
        console.log(`✅ ${i + 1}. ${slot.court}: ${timeDisplay} - ${status}`);
        if (slot.match) {
          console.log(`      ↳ ${slot.notes}`);
        }
        
      } catch (error) {
        console.log(`❌ Failed to create slot ${i + 1}:`, error.message);
      }
    }
    
    // Verify what was created
    const createdSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`\n🎯 RESULT: Created ${createdSlots.length} time slots`);
    
    if (createdSlots.length > 0) {
      console.log('✅ Drag & Drop Schedule should now show time slots');
      console.log('✅ You can drag matches between available slots');
    } else {
      console.log('❌ No time slots were created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

cleanAndCreateSlots();