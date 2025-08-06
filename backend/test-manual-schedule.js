const mongoose = require('mongoose');
require('dotenv').config();

async function testManualScheduleGeneration() {
  await mongoose.connect(process.env.MONGODB_URI);
  const tournamentId = '68798423af6f0ed677e05ec6';
  
  console.log('🧪 Testing manual schedule generation...');
  
  const tournament = await mongoose.connection.db.collection('tournaments').findOne({ 
    _id: new mongoose.Types.ObjectId(tournamentId) 
  });
  
  if (!tournament) {
    console.log('❌ Tournament not found');
    return;
  }
  
  console.log('📋 Tournament found, generating schedule...');
  
  // Import the generateTournamentSchedule function
  const { generateTournamentSchedule } = require('./src/routes/tournaments');
  
  try {
    await generateTournamentSchedule(tournament);
    console.log('✅ Schedule generation completed');
    
    // Check if time slots were created
    const timeSlots = await mongoose.connection.db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log('⏰ Time slots created:', timeSlots.length);
    
    // Check if matches were updated
    const matches = await mongoose.connection.db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    const scheduledMatches = matches.filter(m => m.scheduledDate);
    console.log('📅 Matches with schedules:', scheduledMatches.length, '/', matches.length);
    
  } catch (error) {
    console.error('❌ Schedule generation failed:', error);
  }
  
  await mongoose.disconnect();
}

testManualScheduleGeneration().catch(console.error);