// Check the most recent schedule request to see the actual data being sent

const mongoose = require('mongoose');
require('dotenv').config();

async function debugScheduleRequest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const { Schedule, TimeSlot } = require('./dist/models/index');
    const tournamentId = '6878c1bbbad9b144fb3d2050';
    
    console.log('\n=== SCHEDULE DEBUG ===');
    
    // Check if any schedule exists for this tournament
    const schedules = await Schedule.find({ tournament: tournamentId }).sort({ createdAt: -1 });
    
    console.log(`Found ${schedules.length} schedules for tournament ${tournamentId}`);
    
    if (schedules.length > 0) {
      const latestSchedule = schedules[0];
      console.log('\n--- Latest Schedule Details ---');
      console.log(`ID: ${latestSchedule._id}`);
      console.log(`Name: ${latestSchedule.name}`);
      console.log(`Start Date: ${latestSchedule.startDate}`);
      console.log(`End Date: ${latestSchedule.endDate}`);
      console.log(`Start Time: "${latestSchedule.startTime}"`);
      console.log(`End Time: "${latestSchedule.endTime}"`);
      console.log(`Duration: ${latestSchedule.timeSlotDuration} minutes`);
      console.log(`Courts: ${JSON.stringify(latestSchedule.courts)}`);
      console.log(`Status: ${latestSchedule.status}`);
      console.log(`Created: ${latestSchedule.createdAt}`);
      
      // Check associated time slots
      const timeSlots = await TimeSlot.find({ tournament: tournamentId }).sort({ startTime: 1 });
      
      console.log(`\n--- Time Slots (${timeSlots.length}) ---`);
      timeSlots.slice(0, 5).forEach((slot, i) => {
        console.log(`${i + 1}. ${slot.startTime.toLocaleString()} - ${slot.endTime.toLocaleString()}`);
        console.log(`   Court: ${slot.court} | Status: ${slot.status}`);
      });
      
      if (timeSlots.length > 5) {
        console.log(`... and ${timeSlots.length - 5} more time slots`);
      }
      
      if (timeSlots.length === 0) {
        console.log('❌ NO TIME SLOTS GENERATED - This is likely the problem!');
        
        // Try to manually test time slot generation
        console.log('\n--- Manual Time Slot Generation Test ---');
        try {
          const [startHour, startMin] = latestSchedule.startTime.split(':').map(Number);
          const [endHour, endMin] = latestSchedule.endTime.split(':').map(Number);
          
          console.log(`Parsed times: ${startHour}:${startMin} to ${endHour}:${endMin}`);
          
          if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
            console.log('❌ TIME PARSING FAILED');
          } else {
            console.log('✅ Time parsing successful');
            
            const testDate = new Date(latestSchedule.startDate);
            const startTime = new Date(testDate);
            startTime.setHours(startHour, startMin, 0, 0);
            
            const endTime = new Date(testDate);
            endTime.setHours(endHour, endMin, 0, 0);
            
            console.log(`Test range: ${startTime.toLocaleString()} to ${endTime.toLocaleString()}`);
            
            if (startTime >= endTime) {
              console.log('❌ INVALID TIME RANGE - Start >= End');
            } else {
              console.log('✅ Time range is valid');
              
              // Calculate expected slots
              const duration = latestSchedule.timeSlotDuration || 60;
              const totalMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
              const expectedSlots = Math.floor(totalMinutes / duration);
              console.log(`Expected slots per court: ${expectedSlots} (${totalMinutes} minutes / ${duration} min each)`);
            }
          }
        } catch (error) {
          console.error('Error in manual test:', error);
        }
      }
      
    } else {
      console.log('❌ No schedule found for this tournament');
      
      // Check if there are any schedules at all
      const allSchedules = await Schedule.find({}).sort({ createdAt: -1 }).limit(3);
      console.log(`\nFound ${allSchedules.length} total schedules in database:`);
      allSchedules.forEach((schedule, i) => {
        console.log(`${i + 1}. Tournament: ${schedule.tournament} | Times: ${schedule.startTime}-${schedule.endTime} | Created: ${schedule.createdAt}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

debugScheduleRequest();