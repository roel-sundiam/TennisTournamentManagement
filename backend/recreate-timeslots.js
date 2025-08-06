const mongoose = require('mongoose');
require('dotenv').config();

async function recreateTimeSlots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔧 RECREATING TIME SLOTS');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Clean up any existing time slots
    await db.collection('timeslots').deleteMany({});
    console.log('🗑️ Deleted all existing time slots');
    
    // Get matches with scheduled times
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      scheduledDateTime: { $ne: null }
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
    console.log(`Found ${matches.length} matches with scheduled times`);
    
    // Create time slots for 5 PM to 10 PM
    const timeSlots = [];
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
        tournament: new mongoose.Types.ObjectId(tournamentId), // Ensure ObjectId
        startTime: startTime,
        endTime: endTime,
        status: matchAtThisTime ? 'booked' : 'available',
        duration: 60,
        match: matchAtThisTime ? matchAtThisTime._id : null,
        notes: matchAtThisTime ? `Round ${matchAtThisTime.round} Match ${matchAtThisTime.matchNumber}` : 'Available',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      timeSlots.push(timeSlot);
    });
    
    // Insert time slots
    console.log(`\n⏰ Creating ${timeSlots.length} time slots...`);
    
    const insertResult = await db.collection('timeslots').insertMany(timeSlots);
    console.log(`✅ Created ${insertResult.insertedCount} time slots`);
    
    // Update matches with scheduledTimeSlot references
    console.log('\n🔗 Linking matches to time slots...');
    
    let linksFixed = 0;
    for (const match of matches) {
      const matchTime = new Date(match.scheduledDateTime);
      
      // Find the matching time slot
      const matchingTimeSlot = timeSlots.find(slot => {
        const slotTime = new Date(slot.startTime);
        return slotTime.getHours() === matchTime.getHours() && 
               slotTime.getMinutes() === matchTime.getMinutes();
      });
      
      if (matchingTimeSlot) {
        // Get the inserted time slot ID
        const insertedTimeSlot = Object.values(insertResult.insertedIds).find((id, index) => {
          const slotIndex = timeSlots.findIndex(ts => ts === matchingTimeSlot);
          return index === slotIndex;
        });
        
        if (insertedTimeSlot) {
          // Update the match with the time slot reference
          await db.collection('matches').updateOne(
            { _id: match._id },
            { 
              $set: { 
                scheduledTimeSlot: insertedTimeSlot,
                court: 'Court 1'
              }
            }
          );
          linksFixed++;
          console.log(`✅ Linked Match ${match.matchNumber} to time slot ${insertedTimeSlot}`);
        }
      }
    }
    
    console.log(`\n🎯 RECREATION COMPLETE!`);
    console.log(`✅ Created ${insertResult.insertedCount} time slots`);
    console.log(`✅ Fixed ${linksFixed} match-timeslot links`);
    console.log('✅ Frontend drag & drop should now work!');
    
    // Verify the result
    const verifyTimeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`\n🔍 Verification: ${verifyTimeSlots.length} time slots found`);
    verifyTimeSlots.forEach((slot, i) => {
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  ${i + 1}. ${timeDisplay} - ${slot.status} (${slot.notes})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

recreateTimeSlots();