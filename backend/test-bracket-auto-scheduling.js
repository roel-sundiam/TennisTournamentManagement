const mongoose = require('mongoose');
require('dotenv').config();

async function testBracketAutoScheduling() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    console.log('\n🧪 TESTING BRACKET AUTO-SCHEDULING FLOW');
    console.log('=========================================');
    
    // 1. Create a new tournament with auto-scheduling
    console.log('\n1️⃣ Creating new tournament with auto-scheduling...');
    
    const tournamentData = {
      name: 'Test Bracket Auto-Schedule Tournament',
      description: 'Testing auto-scheduling via bracket generation',
      gameType: 'doubles',
      format: 'single-elimination',
      gameFormat: 'regular',
      maxPlayers: 8,
      registrationDeadline: new Date(),
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      organizer: new mongoose.Types.ObjectId('68750e4a03ebd566affc0876'),
      club: new mongoose.Types.ObjectId('687480d42819d8b020c282c9'),
      status: 'registration-open',
      // Auto-scheduling fields
      autoScheduleEnabled: true,
      dailyStartTime: '18:00',
      dailyEndTime: '22:00',
      availableCourts: ['Court 1', 'Court 2'],
      matchDuration: 60,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.collection('tournaments').insertOne(tournamentData);
    const tournamentId = result.insertedId.toString();
    
    console.log(`✅ Tournament created: ${tournamentId}`);
    console.log(`⚡ Auto-scheduling enabled: ${tournamentData.autoScheduleEnabled}`);
    
    // 2. Create teams for the tournament
    console.log('\n2️⃣ Creating teams...');
    
    const teams = [
      {
        name: 'Team 1',
        players: [new mongoose.Types.ObjectId('687517baa5c9b9a020f4e5a1'), new mongoose.Types.ObjectId('687517baa5c9b9a020f4e5a2')],
        tournament: new mongoose.Types.ObjectId(tournamentId),
        seed: 1,
        isActive: true,
        createdAt: new Date()
      },
      {
        name: 'Team 2',
        players: [new mongoose.Types.ObjectId('687517baa5c9b9a020f4e5a3'), new mongoose.Types.ObjectId('687517baa5c9b9a020f4e5a4')],
        tournament: new mongoose.Types.ObjectId(tournamentId),
        seed: 2,
        isActive: true,
        createdAt: new Date()
      }
    ];
    
    await db.collection('teams').insertMany(teams);
    console.log(`✅ Created ${teams.length} teams`);
    
    // 3. Create matches (simulating bracket generation)
    console.log('\n3️⃣ Creating matches (simulating bracket generation)...');
    
    const matches = [
      {
        tournament: new mongoose.Types.ObjectId(tournamentId),
        round: 1,
        matchNumber: 1,
        team1: teams[0].name,
        team2: teams[1].name,
        team1Players: teams[0].players,
        team2Players: teams[1].players,
        status: 'pending',
        createdAt: new Date()
      }
    ];
    
    await db.collection('matches').insertMany(matches);
    console.log(`✅ Created ${matches.length} matches`);
    
    // 4. Create a bracket document (simulating POST /api/brackets)
    console.log('\n4️⃣ Creating bracket document...');
    
    const bracketData = {
      tournament: new mongoose.Types.ObjectId(tournamentId),
      name: `${tournamentData.name} Bracket`,
      format: 'single-elimination',
      teams: teams.map(t => t._id),
      totalTeams: teams.length,
      totalRounds: 1,
      status: 'active',
      bracketData: {
        name: 'Test Bracket',
        totalRounds: 1
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.collection('brackets').insertOne(bracketData);
    console.log(`✅ Created bracket document`);
    
    // 5. Now test the auto-scheduling trigger (simulating the bracket creation endpoint)
    console.log('\n5️⃣ Testing auto-scheduling trigger from bracket creation...');
    
    // Import the tournament and scheduling function
    const Tournament = require('./dist/models/Tournament').default;
    const { generateTournamentSchedule } = require('./dist/routes/tournaments');
    
    // Get tournament with auto-scheduling enabled
    const tournament = await Tournament.findById(tournamentId);
    
    if (tournament && tournament.autoScheduleEnabled) {
      console.log('🗓️ Auto-scheduling enabled, triggering schedule generation...');
      try {
        await generateTournamentSchedule(tournament);
        console.log('✅ Auto-scheduling completed');
      } catch (error) {
        console.error('❌ Auto-scheduling failed:', error);
      }
    } else {
      console.log('⚠️ Auto-scheduling not enabled or tournament not found');
    }
    
    // 6. Check if scheduling worked
    console.log('\n6️⃣ Verifying auto-scheduling results...');
    
    // Check if Schedule document was created
    const scheduleDoc = await db.collection('schedules').findOne({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    });
    
    console.log(`📅 Schedule document: ${scheduleDoc ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check if time slots were created
    const timeSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId) 
    }).toArray();
    
    console.log(`⏰ Time slots: ${timeSlots.length} found`);
    
    // Check if matches were scheduled
    const scheduledMatches = await db.collection('matches').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      scheduledDateTime: { $exists: true }
    }).toArray();
    
    console.log(`🎾 Scheduled matches: ${scheduledMatches.length}/${matches.length}`);
    
    // Show scheduled match details
    if (scheduledMatches.length > 0) {
      console.log('\n📋 Scheduled Match Details:');
      scheduledMatches.forEach((match, index) => {
        const timeDisplay = match.scheduledDateTime.toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        console.log(`   Match ${match.matchNumber}: ${match.team1} vs ${match.team2} at ${timeDisplay}`);
      });
    }
    
    // Check if time slots are booked
    const bookedSlots = await db.collection('timeslots').find({ 
      tournament: new mongoose.Types.ObjectId(tournamentId),
      status: 'booked'
    }).toArray();
    
    console.log(`🎯 Booked time slots: ${bookedSlots.length}`);
    
    // 7. Final assessment
    console.log('\n7️⃣ AUTO-SCHEDULING ASSESSMENT:');
    console.log('================================');
    
    const hasSchedule = scheduleDoc !== null;
    const hasTimeSlots = timeSlots.length > 0;
    const hasScheduledMatches = scheduledMatches.length > 0;
    const hasBookedSlots = bookedSlots.length > 0;
    
    console.log(`✅ Schedule document created: ${hasSchedule}`);
    console.log(`✅ Time slots generated: ${hasTimeSlots} (${timeSlots.length} total)`);
    console.log(`✅ Matches scheduled: ${hasScheduledMatches} (${scheduledMatches.length}/${matches.length})`);
    console.log(`✅ Time slots booked: ${hasBookedSlots} (${bookedSlots.length} total)`);
    
    const isWorking = hasSchedule && hasTimeSlots && hasScheduledMatches && hasBookedSlots;
    
    console.log(`\n🎯 AUTO-SCHEDULING STATUS: ${isWorking ? '✅ WORKING' : '❌ BROKEN'}`);
    
    if (isWorking) {
      console.log('🎉 Auto-scheduling is working correctly!');
      console.log('✅ New tournaments should now show match schedules automatically');
    } else {
      console.log('❌ Auto-scheduling is still broken');
      console.log('⚠️  Manual intervention still required for new tournaments');
    }
    
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await db.collection('tournaments').deleteOne({ _id: new mongoose.Types.ObjectId(tournamentId) });
    await db.collection('teams').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    await db.collection('matches').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    await db.collection('brackets').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    await db.collection('schedules').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    await db.collection('timeslots').deleteMany({ tournament: new mongoose.Types.ObjectId(tournamentId) });
    console.log('✅ Test data cleaned up');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

testBracketAutoScheduling();