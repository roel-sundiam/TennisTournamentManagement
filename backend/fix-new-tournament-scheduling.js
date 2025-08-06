const mongoose = require('mongoose');
require('dotenv').config();

async function fixNewTournamentScheduling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '68790850dfdf2780f694f793';
    
    console.log('\n🔧 FIXING NEW TOURNAMENT SCHEDULING');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get tournament details
    const tournament = await db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log(`📋 Tournament: ${tournament.name}`);
    console.log(`⚡ Auto-scheduling: ${tournament.autoScheduleEnabled}`);
    console.log(`🕐 Time: ${tournament.dailyStartTime} - ${tournament.dailyEndTime}`);
    console.log(`🏟️ Courts: ${tournament.availableCourts}`);
    console.log(`⏱️ Duration: ${tournament.matchDuration} minutes`);
    
    // Get match count
    const totalMatches = await db.collection('matches').countDocuments({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log(`⚔️ Total matches: ${totalMatches}`);
    
    // 1. Create Schedule document
    console.log('\n📅 Creating Schedule document...');
    
    const schedule = {
      tournament: new mongoose.Types.ObjectId(tournamentId),
      name: `${tournament.name} - Auto-Generated Schedule`,
      description: 'Schedule created to support drag & drop functionality',
      startDate: new Date(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      courts: Array.isArray(tournament.availableCourts) ? tournament.availableCourts : [tournament.availableCourts],
      timeSlotDuration: tournament.matchDuration || 60,
      startTime: tournament.dailyStartTime || '18:00',
      endTime: tournament.dailyEndTime || '22:00',
      breakBetweenMatches: 5, // 5 minute break
      totalMatches: totalMatches,
      scheduledMatches: 0, // Will be updated when matches are assigned
      conflicts: [],
      estimatedDuration: Math.ceil(totalMatches * (tournament.matchDuration || 60) / 60), // Hours
      status: 'published',
      generatedAt: new Date(),
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('schedules').insertOne(schedule);
    console.log('✅ Schedule document created:', schedule._id);
    
    // 2. Generate time slots
    console.log('\n⏰ Generating time slots...');
    
    const timeSlots = [];
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 1); // Tomorrow
    
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    
    const courts = Array.isArray(tournament.availableCourts) ? tournament.availableCourts : [tournament.availableCourts];
    
    for (const court of courts) {
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotStart = new Date(baseDate);
        slotStart.setHours(currentHour, currentMin, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
        
        // Check if slot end time exceeds daily end time
        const slotEndHour = slotEnd.getHours();
        const slotEndMin = slotEnd.getMinutes();
        
        if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
          break; // Don't create slots that exceed the daily window
        }
        
        timeSlots.push({
          tournament: new mongoose.Types.ObjectId(tournamentId),
          startTime: slotStart,
          endTime: slotEnd,
          status: 'available',
          duration: matchDuration,
          notes: `Court: ${court}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Move to next slot
        currentMin += matchDuration;
        if (currentMin >= 60) {
          currentHour += Math.floor(currentMin / 60);
          currentMin = currentMin % 60;
        }
      }
    }
    
    if (timeSlots.length > 0) {
      await db.collection('timeslots').insertMany(timeSlots);
      console.log(`✅ Created ${timeSlots.length} time slots`);
    }
    
    // 3. Schedule Round 1 matches to time slots
    console.log('\n🎾 Scheduling Round 1 matches...');
    
    const round1Matches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId), 
      round: 1 
    }).sort({ matchNumber: 1 }).toArray();
    
    const availableSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      status: 'available' 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`Found ${round1Matches.length} Round 1 matches and ${availableSlots.length} available slots`);
    
    // Assign matches to slots
    for (let i = 0; i < Math.min(round1Matches.length, availableSlots.length); i++) {
      const match = round1Matches[i];
      const slot = availableSlots[i];
      
      // Update match with scheduled time
      await db.collection('matches').updateOne(
        { _id: match._id },
        { 
          $set: {
            scheduledDateTime: slot.startTime,
            scheduledTimeSlot: slot._id,
            court: 'Court 1',
            status: 'scheduled'
          }
        }
      );
      
      // Update time slot as assigned
      await db.collection('timeslots').updateOne(
        { _id: slot._id },
        { 
          $set: {
            match: match._id,
            status: 'booked'
          }
        }
      );
      
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`✅ Scheduled Match ${match.matchNumber}: ${timeDisplay}`);
    }
    
    // 4. Update schedule with scheduled matches count
    const scheduledCount = Math.min(round1Matches.length, availableSlots.length);
    await db.collection('schedules').updateOne(
      { _id: schedule._id },
      { 
        $set: { 
          scheduledMatches: scheduledCount,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('\n🎯 TOURNAMENT SCHEDULING FIXED!');
    console.log(`✅ Created schedule document`);
    console.log(`✅ Generated ${timeSlots.length} time slots`);
    console.log(`✅ Scheduled ${scheduledCount} matches`);
    console.log('✅ Table view and drag & drop should now work!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixNewTournamentScheduling();