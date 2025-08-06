const mongoose = require('mongoose');
const { config } = require('dotenv');

// Load environment variables
config();

// Import models
require('../models/Tournament');
require('../models/Match');
require('../models/TimeSlot');
require('../models/Schedule');

const Tournament = mongoose.model('Tournament');
const Match = mongoose.model('Match');
const TimeSlot = mongoose.model('TimeSlot');
const Schedule = mongoose.model('Schedule');

async function autoFixAllTournaments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Find all tournaments
    const tournaments = await Tournament.find({}).sort({ createdAt: -1 });
    console.log(`Found ${tournaments.length} tournaments to check`);

    for (const tournament of tournaments) {
      console.log(`\n🏆 Checking tournament: ${tournament.name} (${tournament._id})`);
      
      // Check if tournament has matches
      const matches = await Match.find({ tournament: tournament._id });
      console.log(`  📋 Found ${matches.length} matches`);
      
      if (matches.length === 0) {
        console.log(`  ⚠️ No matches found for ${tournament.name}, skipping...`);
        continue;
      }
      
      // Check how many matches are unscheduled
      const unscheduledMatches = matches.filter(match => !match.scheduledDateTime);
      console.log(`  🔍 Unscheduled matches: ${unscheduledMatches.length}`);
      
      if (unscheduledMatches.length === 0) {
        console.log(`  ✅ All matches already scheduled for ${tournament.name}`);
        continue;
      }
      
      // Get time slots for this tournament
      const timeSlots = await TimeSlot.find({ tournament: tournament._id }).sort({ startTime: 1 });
      console.log(`  ⏰ Found ${timeSlots.length} time slots`);
      
      // Check for orphaned time slots (booked but no match)
      const orphanedSlots = timeSlots.filter(slot => slot.status === 'booked' && !slot.match);
      console.log(`  🔧 Orphaned time slots: ${orphanedSlots.length}`);
      
      if (orphanedSlots.length > 0) {
        console.log(`  🔄 Fixing orphaned time slots...`);
        await TimeSlot.updateMany(
          { tournament: tournament._id, status: 'booked', match: { $exists: false } },
          { status: 'available', $unset: { match: 1 } }
        );
        console.log(`  ✅ Fixed ${orphanedSlots.length} orphaned time slots`);
      }
      
      // Also fix null match fields
      const nullMatchSlots = timeSlots.filter(slot => slot.status === 'booked' && slot.match === null);
      if (nullMatchSlots.length > 0) {
        console.log(`  🔄 Fixing null match time slots...`);
        await TimeSlot.updateMany(
          { tournament: tournament._id, status: 'booked', match: null },
          { status: 'available', $unset: { match: 1 } }
        );
        console.log(`  ✅ Fixed ${nullMatchSlots.length} null match time slots`);
      }
      
      // Get available time slots after fixing
      const availableSlots = await TimeSlot.find({ 
        tournament: tournament._id, 
        status: 'available' 
      }).sort({ startTime: 1 });
      
      console.log(`  📅 Available time slots after fix: ${availableSlots.length}`);
      
      if (availableSlots.length === 0) {
        console.log(`  ❌ No available time slots for ${tournament.name}`);
        continue;
      }
      
      // Schedule unscheduled matches
      const maxSchedulable = Math.min(unscheduledMatches.length, availableSlots.length);
      console.log(`  📝 Scheduling ${maxSchedulable} matches...`);
      
      let scheduledCount = 0;
      for (let i = 0; i < maxSchedulable; i++) {
        const match = unscheduledMatches[i];
        const timeSlot = availableSlots[i];
        
        try {
          // Update match
          const matchUpdateResult = await Match.findByIdAndUpdate(match._id, {
            scheduledTimeSlot: timeSlot._id,
            scheduledDateTime: timeSlot.startTime,
            court: timeSlot.court || `Court ${i + 1}`
          });
          
          if (!matchUpdateResult) {
            throw new Error(`Failed to update match ${match._id}`);
          }
          
          // Update time slot
          await TimeSlot.findByIdAndUpdate(timeSlot._id, {
            status: 'booked',
            match: match._id
          });
          
          scheduledCount++;
          console.log(`    ✅ Scheduled Match ${match.matchNumber} to ${timeSlot.startTime}`);
        } catch (error) {
          console.error(`    ❌ Error scheduling match ${match.matchNumber}:`, error.message);
          
          // Reset time slot on error
          try {
            await TimeSlot.findByIdAndUpdate(timeSlot._id, {
              status: 'available',
              $unset: { match: 1 }
            });
          } catch (resetError) {
            console.error(`    ❌ Error resetting time slot:`, resetError.message);
          }
        }
      }
      
      console.log(`  📊 Successfully scheduled ${scheduledCount} matches for ${tournament.name}`);
    }
    
    console.log('\n🎯 Auto-fix complete for all tournaments!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the auto-fix
autoFixAllTournaments();