const mongoose = require('mongoose');
require('dotenv').config();

async function fixMatchTimeSlotLinks() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔗 FIXING MATCH-TIMESLOT LINKS');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get all time slots
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`⏰ Found ${timeSlots.length} time slots`);
    
    // Get all matches with scheduled times
    const matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      scheduledDateTime: { $exists: true, $ne: null }
    }).sort({ round: 1, matchNumber: 1 }).toArray();
    
    console.log(`⚔️ Found ${matches.length} scheduled matches`);
    
    let linksFixed = 0;
    
    // Link each match to its corresponding time slot
    for (const match of matches) {
      const matchTime = new Date(match.scheduledDateTime);
      console.log(`\n🔍 Processing Match ${match.matchNumber} scheduled at ${matchTime.toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`);
      
      // Find the time slot that matches this time
      const matchingTimeSlot = timeSlots.find(slot => {
        const slotTime = new Date(slot.startTime);
        // Compare by hour since they should match exactly
        return slotTime.getHours() === matchTime.getHours() && 
               slotTime.getMinutes() === matchTime.getMinutes();
      });
      
      if (matchingTimeSlot) {
        console.log(`  ✅ Found matching time slot: ${matchingTimeSlot._id}`);
        
        // Update the match to include the scheduledTimeSlot reference
        await db.collection('matches').updateOne(
          { _id: match._id },
          { 
            $set: { 
              scheduledTimeSlot: matchingTimeSlot._id,
              court: 'Court 1' // Set court from time slot notes or default
            }
          }
        );
        
        // Ensure the time slot points back to the match
        await db.collection('timeslots').updateOne(
          { _id: matchingTimeSlot._id },
          { 
            $set: { 
              match: match._id,
              status: 'booked'
            }
          }
        );
        
        linksFixed++;
        console.log(`  ✅ Linked match ${match.matchNumber} ↔ time slot ${matchingTimeSlot._id}`);
      } else {
        console.log(`  ❌ No matching time slot found for match ${match.matchNumber}`);
      }
    }
    
    console.log(`\n🎯 LINK FIXING COMPLETE!`);
    console.log(`✅ Fixed ${linksFixed} match-timeslot links`);
    console.log('✅ Drag & Drop interface should now show matches in time slots');
    console.log('✅ Test at /tournaments/6878d6d4dfdf2780f694db4a/manage → Drag & Drop Schedule');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixMatchTimeSlotLinks();