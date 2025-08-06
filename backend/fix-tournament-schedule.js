const mongoose = require('mongoose');
require('dotenv').config();

async function fixTournamentSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Tournament = require('./dist/models/Tournament').default;
    const Schedule = require('./dist/models/Schedule').default;
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const Match = require('./dist/models/Match').default;
    
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔧 FIXING TOURNAMENT SCHEDULE');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found!');
      return;
    }
    
    console.log(`📋 Tournament: ${tournament.name}`);
    console.log(`Auto-scheduling enabled: ${tournament.autoScheduleEnabled}`);
    
    if (!tournament.autoScheduleEnabled) {
      console.log('❌ Auto-scheduling not enabled for this tournament');
      return;
    }
    
    // Clean up any existing schedules/slots to start fresh
    await Schedule.deleteMany({ tournament: tournamentId });
    await TimeSlot.deleteMany({ tournament: tournamentId });
    console.log('🧹 Cleaned up existing schedules');
    
    // Generate schedule (tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Get match count for the schedule
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    
    const schedule = await Schedule.create({
      tournament: tournamentId,
      name: `${tournament.name} - Auto-Generated Schedule`,
      description: 'Automatically generated schedule with optimized time slots',
      startDate: tomorrow,
      endDate: tomorrow, // Single day tournament for now
      courts: tournament.availableCourts,
      timeSlotDuration: tournament.matchDuration || 60,
      startTime: tournament.dailyStartTime,
      endTime: tournament.dailyEndTime,
      breakBetweenMatches: 5, // 5 minute break between matches
      totalMatches: totalMatches,
      scheduledMatches: 0, // Will be updated when matches are assigned
      conflicts: [],
      estimatedDuration: Math.ceil(totalMatches * (tournament.matchDuration || 60) / 60), // Hours
      status: 'published',
      generatedAt: new Date(),
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('📅 Created schedule record:', schedule._id);
    
    // Generate time slots
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    
    const timeSlots = [];
    
    for (const court of tournament.availableCourts) {
      let currentHour = startHour;
      let currentMin = startMin;
      
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const slotStart = new Date(tomorrow);
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
          tournament: tournamentId,
          court: court,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          match: null,
          createdAt: new Date()
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
      await TimeSlot.insertMany(timeSlots);
      console.log(`⏰ Created ${timeSlots.length} time slots`);
      
      // Display generated time slots
      console.log('\n📅 Generated Time Slots:');
      timeSlots.forEach((slot, i) => {
        const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        console.log(`  ${i + 1}. ${slot.court}: ${timeDisplay}`);
      });
      
      // Now assign Round 1 matches to time slots
      console.log('\n🎾 Assigning Round 1 matches to time slots...');
      
      const round1Matches = await Match.find({ 
        tournament: tournamentId, 
        round: 1,
        status: { $in: ['pending', 'scheduled'] }
      }).sort({ matchNumber: 1 });
      
      const availableSlots = await TimeSlot.find({ 
        tournament: tournamentId,
        isAvailable: true 
      }).sort({ startTime: 1 });
      
      console.log(`Found ${round1Matches.length} Round 1 matches and ${availableSlots.length} available time slots`);
      
      // Assign matches to slots
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
        await TimeSlot.updateOne(
          { _id: slot._id },
          { 
            match: match._id,
            isAvailable: false 
          }
        );
        
        const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        console.log(`✅ Assigned Match ${match.matchNumber}: ${slot.court} at ${timeDisplay}`);
      }
      
      console.log('\n🎯 SCHEDULE FIX COMPLETE!');
      console.log('✅ Tournament now has proper schedule and match assignments');
      console.log('✅ Go to tournament management → Schedule tab to see the matches');
      
    } else {
      console.log('❌ No time slots generated - check time window configuration');
    }
    
  } catch (error) {
    console.error('❌ Error fixing schedule:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixTournamentSchedule();