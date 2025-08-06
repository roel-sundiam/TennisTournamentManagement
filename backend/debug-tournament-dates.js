const mongoose = require('mongoose');
const Tournament = require('./dist/models/Tournament').default;

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';

async function debugTournamentDates() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const tournamentId = '6879b6b5c1470a4ab4f4a416';
    
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      return;
    }
    
    console.log('🏆 Tournament Date Analysis:');
    console.log(`  Name: ${tournament.name}`);
    console.log(`  Start Date: ${tournament.startDate}`);
    console.log(`  End Date: ${tournament.endDate}`);
    
    // Replicate the schedule logic
    const tournamentStartDate = new Date(tournament.startDate || new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduleDate = tournamentStartDate > new Date() ? tournamentStartDate : tomorrow;
    
    console.log('\n📅 Schedule Date Calculation:');
    console.log(`  Tournament Start Date: ${tournamentStartDate}`);
    console.log(`  Tomorrow: ${tomorrow}`);
    console.log(`  Calculated Schedule Date: ${scheduleDate}`);
    
    const tournamentEndDate = new Date(tournament.endDate || scheduleDate);
    const tournamentDays = Math.ceil((tournamentEndDate.getTime() - scheduleDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    
    console.log(`  Tournament End Date: ${tournamentEndDate}`);
    console.log(`  Calculated Tournament Days: ${tournamentDays}`);
    console.log(`  Days Limited to: ${Math.min(tournamentDays, 7)}`);
    
    // Test time slot generation
    const [startHour, startMin] = tournament.dailyStartTime.split(':').map(Number);
    const [endHour, endMin] = tournament.dailyEndTime.split(':').map(Number);
    const matchDuration = tournament.matchDuration || 60;
    
    console.log('\n⏰ Time Window Analysis:');
    console.log(`  Start: ${startHour}:${startMin}`);
    console.log(`  End: ${endHour}:${endMin}`);
    console.log(`  Match Duration: ${matchDuration} minutes`);
    console.log(`  Available Courts: ${JSON.stringify(tournament.availableCourts)}`);
    
    // Simulate time slot generation
    let totalSlots = 0;
    for (let day = 0; day < Math.min(tournamentDays, 7); day++) {
      const currentDate = new Date(scheduleDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      for (const court of tournament.availableCourts) {
        let currentHour = startHour;
        let currentMin = startMin;
        let slotsForThisCourtDay = 0;
        
        while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
          const slotStart = new Date(currentDate);
          slotStart.setHours(currentHour, currentMin, 0, 0);
        
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + matchDuration);
          
          // Check if slot end time exceeds daily end time
          const slotEndHour = slotEnd.getHours();
          const slotEndMin = slotEnd.getMinutes();
          
          if (slotEndHour > endHour || (slotEndHour === endHour && slotEndMin > endMin)) {
            break; // Don't create slots that exceed the daily window
          }
          
          slotsForThisCourtDay++;
          totalSlots++;
          
          // Move to next slot
          currentMin += matchDuration;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
        
        console.log(`  Day ${day + 1}, ${court}: ${slotsForThisCourtDay} slots`);
      }
    }
    
    console.log(`\n🔍 Expected Total Time Slots: ${totalSlots}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugTournamentDates();