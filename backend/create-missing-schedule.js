const mongoose = require('mongoose');
require('dotenv').config();

async function createMissingSchedule() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Schedule = require('./dist/models/Schedule').default;
    const Tournament = require('./dist/models/Tournament').default;
    const TimeSlot = require('./dist/models/TimeSlot').default;
    const Match = require('./dist/models/Match').default;
    
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔧 CREATING MISSING SCHEDULE DOCUMENT');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found!');
      return;
    }
    
    console.log(`📋 Tournament: ${tournament.name}`);
    
    // Check if schedule already exists
    const existingSchedule = await Schedule.findOne({ tournament: tournamentId });
    if (existingSchedule) {
      console.log('✅ Schedule already exists:', existingSchedule._id);
      return;
    }
    
    // Get time slots count
    const timeSlots = await TimeSlot.find({ tournament: tournamentId });
    console.log(`⏰ Found ${timeSlots.length} time slots`);
    
    // Get match count
    const totalMatches = await Match.countDocuments({ tournament: tournamentId });
    const scheduledMatches = await Match.countDocuments({ 
      tournament: tournamentId,
      scheduledDateTime: { $ne: null } 
    });
    console.log(`⚔️ Found ${totalMatches} total matches, ${scheduledMatches} scheduled`);
    
    // Determine schedule details from tournament
    const startDate = tournament.startDate || new Date();
    const endDate = tournament.endDate || new Date(startDate.getTime() + 24 * 60 * 60 * 1000); // Next day
    const dailyStartTime = tournament.dailyStartTime || '17:00';
    const dailyEndTime = tournament.dailyEndTime || '22:00';
    const availableCourts = tournament.availableCourts || ['Court 1'];
    const matchDuration = tournament.matchDuration || 60;
    
    console.log('📅 Schedule parameters:');
    console.log(`  Start: ${startDate}`);
    console.log(`  End: ${endDate}`);
    console.log(`  Time: ${dailyStartTime} - ${dailyEndTime}`);
    console.log(`  Courts: ${availableCourts.join(', ')}`);
    console.log(`  Duration: ${matchDuration} min`);
    
    // Create schedule document
    const schedule = await Schedule.create({
      tournament: tournamentId,
      name: `${tournament.name} - Auto-Generated Schedule`,
      description: 'Schedule created to support drag & drop functionality',
      startDate: startDate,
      endDate: endDate,
      courts: availableCourts,
      timeSlotDuration: matchDuration,
      startTime: dailyStartTime,
      endTime: dailyEndTime,
      breakBetweenMatches: 5, // 5 minute break
      totalMatches: totalMatches,
      scheduledMatches: scheduledMatches,
      conflicts: [],
      estimatedDuration: Math.ceil(totalMatches * matchDuration / 60), // Hours
      status: 'published',
      generatedAt: new Date(),
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Created schedule document:', schedule._id);
    
    console.log('\n🎯 SCHEDULE CREATION COMPLETE!');
    console.log('✅ Frontend should now be able to load time slots');
    console.log('✅ Drag & Drop Schedule tab should display time slots');
    console.log('✅ Go to /tournaments/6878d6d4dfdf2780f694db4a/manage#schedule to test');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

createMissingSchedule();