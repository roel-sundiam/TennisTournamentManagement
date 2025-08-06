const mongoose = require('mongoose');
require('dotenv').config();

async function quickScheduleFix() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('🔧 QUICK SCHEDULE CREATION TOOL');
    console.log('Use this when schedule creation from UI fails');
    console.log('');
    
    // Get tournament ID from command line argument
    const tournamentId = process.argv[2];
    
    if (!tournamentId) {
      console.log('Usage: node quick-schedule-fix.js <tournament-id>');
      console.log('Example: node quick-schedule-fix.js 6878cf2c44caf53ff8b489ec');
      return;
    }
    
    console.log(`Creating schedule for tournament: ${tournamentId}`);
    
    const db = mongoose.connection.db;
    
    // Check if tournament exists
    const tournament = await db.collection('tournaments').findOne({ 
      _id: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    if (!tournament) {
      console.log('❌ Tournament not found!');
      return;
    }
    
    console.log(`✅ Found tournament: ${tournament.name}`);
    
    // Delete any existing schedule/slots to avoid conflicts
    await db.collection('schedules').deleteMany({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    await db.collection('timeslots').deleteMany({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log('🧹 Cleaned up existing schedules');
    
    // Create new schedule (tomorrow, 6-10 PM)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const schedule = {
      tournament: new mongoose.Types.ObjectId(tournamentId),
      date: tomorrow,
      startTime: '18:00', // 6 PM
      endTime: '22:00',   // 10 PM
      courts: ['Court 1', 'Court 2'],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const scheduleResult = await db.collection('schedules').insertOne(schedule);
    console.log('📅 Created schedule');
    
    // Generate time slots
    const timeSlots = [];
    const startHour = 18;
    const endHour = 22;
    const matchDuration = 60; // minutes
    
    for (const court of schedule.courts) {
      for (let hour = startHour; hour < endHour; hour++) {
        const slotStart = new Date(tomorrow);
        slotStart.setHours(hour, 0, 0, 0);
        
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
        
        timeSlots.push({
          tournament: new mongoose.Types.ObjectId(tournamentId),
          court: court,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          match: null,
          createdAt: new Date()
        });
      }
    }
    
    await db.collection('timeslots').insertMany(timeSlots);
    console.log(`⏰ Created ${timeSlots.length} time slots`);
    
    // Assign Round 1 matches to slots
    const { Match } = require('./dist/models/index');
    const round1Matches = await Match.find({ 
      tournament: tournamentId, 
      round: 1 
    }).sort({ matchNumber: 1 });
    
    const availableSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      isAvailable: true 
    }).sort({ startTime: 1 }).toArray();
    
    console.log(`🎾 Assigning ${round1Matches.length} matches to slots`);
    
    for (let i = 0; i < Math.min(round1Matches.length, availableSlots.length); i++) {
      const match = round1Matches[i];
      const slot = availableSlots[i];
      
      await Match.updateOne(
        { _id: match._id },
        { 
          scheduledDateTime: slot.startTime,
          status: 'scheduled'
        }
      );
      
      await db.collection('timeslots').updateOne(
        { _id: slot._id },
        { 
          $set: { 
            match: match._id,
            isAvailable: false 
          }
        }
      );
      
      const timeDisplay = slot.startTime.toLocaleString('en-PH', { 
        timeZone: 'Asia/Manila',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      console.log(`✅ Match ${match.matchNumber}: ${slot.court} at ${timeDisplay}`);
    }
    
    console.log('');
    console.log('🎯 SCHEDULE CREATION COMPLETE!');
    console.log('Refresh the UI - matches should now be visible.');
    console.log('');
    console.log('Next time: Use this script for any new tournament that has schedule issues.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

quickScheduleFix();