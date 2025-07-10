import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, Tournament, Player, Team, Match, Bracket } from '../models';

// Load environment variables
dotenv.config();

const seedData = async () => {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/TennisTournamentManagement';
    await mongoose.connect(mongoURI);
    console.log('🔗 Connected to MongoDB for seeding');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Tournament.deleteMany({});
    await Player.deleteMany({});
    await Team.deleteMany({});
    await Match.deleteMany({});
    await Bracket.deleteMany({});

    // Create test users
    console.log('👥 Creating test users...');
    const adminUser = await User.create({
      username: 'admin',
      email: 'admin@tennistournament.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    const organizerUser = await User.create({
      username: 'organizer1',
      email: 'organizer@tennistournament.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Organizer',
      role: 'organizer'
    });

    console.log('✅ Created users:', { adminUser: adminUser.username, organizerUser: organizerUser.username });

    // Create test tournaments
    console.log('🏆 Creating test tournaments...');
    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 30); // 30 days from now
    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 32); // 32 days from now
    const regDeadline1 = new Date();
    regDeadline1.setDate(regDeadline1.getDate() + 25); // 25 days from now

    const tournament1 = await Tournament.create({
      name: 'Spring Tennis Championship 2024',
      description: 'Annual spring tennis tournament featuring singles competition',
      startDate: futureDate1,
      endDate: futureDate2,
      registrationDeadline: regDeadline1,
      maxPlayers: 8,
      currentPlayers: 6,
      format: 'single-elimination',
      gameType: 'singles',
      status: 'registration-open',
      venue: 'Central Tennis Club',
      entryFee: 50,
      prizePool: 1000,
      organizer: organizerUser._id
    });

    const futureDate3 = new Date();
    futureDate3.setDate(futureDate3.getDate() + 45); // 45 days from now
    const futureDate4 = new Date();
    futureDate4.setDate(futureDate4.getDate() + 47); // 47 days from now
    const regDeadline2 = new Date();
    regDeadline2.setDate(regDeadline2.getDate() + 40); // 40 days from now

    const tournament2 = await Tournament.create({
      name: 'Doubles Masters Tournament',
      description: 'Professional doubles tournament with elimination format',
      startDate: futureDate3,
      endDate: futureDate4,
      registrationDeadline: regDeadline2,
      maxPlayers: 8, // 4 teams of 2 players each
      currentPlayers: 4,
      format: 'double-elimination',
      gameType: 'doubles',
      status: 'registration-open',
      venue: 'Elite Tennis Academy',
      entryFee: 100,
      prizePool: 2000,
      organizer: organizerUser._id
    });

    console.log('✅ Created tournaments:', { 
      tournament1: tournament1.name, 
      tournament2: tournament2.name 
    });

    // Create test players for tournament 1 (singles)
    console.log('👤 Creating test players...');
    const players1 = await Promise.all([
      Player.create({
        firstName: 'Alex',
        lastName: 'Johnson',
        email: 'alex.johnson@email.com',
        skillLevel: 'advanced',
        tournament: tournament1._id,
        seed: 1
      }),
      Player.create({
        firstName: 'Maria',
        lastName: 'Garcia',
        email: 'maria.garcia@email.com',
        skillLevel: 'professional',
        tournament: tournament1._id,
        seed: 2
      }),
      Player.create({
        firstName: 'David',
        lastName: 'Chen',
        email: 'david.chen@email.com',
        skillLevel: 'intermediate',
        tournament: tournament1._id,
        seed: 3
      }),
      Player.create({
        firstName: 'Sarah',
        lastName: 'Wilson',
        email: 'sarah.wilson@email.com',
        skillLevel: 'advanced',
        tournament: tournament1._id,
        seed: 4
      }),
      Player.create({
        firstName: 'Michael',
        lastName: 'Brown',
        email: 'michael.brown@email.com',
        skillLevel: 'intermediate',
        tournament: tournament1._id,
        seed: 5
      }),
      Player.create({
        firstName: 'Emma',
        lastName: 'Davis',
        email: 'emma.davis@email.com',
        skillLevel: 'beginner',
        tournament: tournament1._id,
        seed: 6
      })
    ]);

    // Create test players for tournament 2 (doubles)
    const players2 = await Promise.all([
      Player.create({
        firstName: 'James',
        lastName: 'Miller',
        email: 'james.miller@email.com',
        skillLevel: 'professional',
        tournament: tournament2._id
      }),
      Player.create({
        firstName: 'Lisa',
        lastName: 'Anderson',
        email: 'lisa.anderson@email.com',
        skillLevel: 'advanced',
        tournament: tournament2._id
      }),
      Player.create({
        firstName: 'Robert',
        lastName: 'Taylor',
        email: 'robert.taylor@email.com',
        skillLevel: 'intermediate',
        tournament: tournament2._id
      }),
      Player.create({
        firstName: 'Jennifer',
        lastName: 'Martinez',
        email: 'jennifer.martinez@email.com',
        skillLevel: 'advanced',
        tournament: tournament2._id
      })
    ]);

    console.log('✅ Created players:', { 
      tournament1Players: players1.length, 
      tournament2Players: players2.length 
    });

    // Create teams for tournament 1 (singles - each player is their own team)
    console.log('👥 Creating test teams...');
    const teams1 = await Promise.all(
      players1.map((player, index) => 
        Team.create({
          name: `${player.firstName} ${player.lastName}`,
          players: [player._id],
          tournament: tournament1._id,
          seed: player.ranking || 1,
          averageSkillLevel: player.skillLevel
        })
      )
    );

    // Create teams for tournament 2 (doubles - 2 players per team)
    const teams2 = await Promise.all([
      Team.create({
        name: 'Power Duo',
        players: [players2[0]._id, players2[1]._id],
        tournament: tournament2._id,
        seed: 1,
        averageSkillLevel: 'advanced'
      }),
      Team.create({
        name: 'Dynamic Pair',
        players: [players2[2]._id, players2[3]._id],
        tournament: tournament2._id,
        seed: 2,
        averageSkillLevel: 'intermediate'
      })
    ]);

    console.log('✅ Created teams:', { 
      tournament1Teams: teams1.length, 
      tournament2Teams: teams2.length 
    });

    // Create brackets
    console.log('🗂️ Creating test brackets...');
    const bracket1 = await Bracket.create({
      tournament: tournament1._id,
      format: 'single-elimination',
      totalTeams: teams1.length,
      totalRounds: 3, // log2(8) = 3 rounds needed
      isGenerated: true
    });

    const bracket2 = await Bracket.create({
      tournament: tournament2._id,
      format: 'double-elimination',
      totalTeams: teams2.length,
      totalRounds: 2, // log2(4) = 2 rounds needed
      isGenerated: true
    });

    console.log('✅ Created brackets:', { 
      bracket1: bracket1.format, 
      bracket2: bracket2.format 
    });

    // Create some sample matches
    console.log('🎾 Creating test matches...');
    const matchDate1 = new Date(futureDate1);
    matchDate1.setHours(10, 0, 0, 0);
    const matchDate2 = new Date(futureDate1);
    matchDate2.setHours(12, 0, 0, 0);

    const match1 = await Match.create({
      tournament: tournament1._id,
      round: 1,
      matchNumber: 1,
      team1: teams1[0]._id,
      team2: teams1[1]._id,
      scheduledDateTime: matchDate1,
      court: 'Court 1',
      status: 'scheduled',
      bracket: bracket1._id,
      bracketPosition: { round: 1, position: 1 }
    });

    const match2 = await Match.create({
      tournament: tournament1._id,
      round: 1,
      matchNumber: 2,
      team1: teams1[2]._id,
      team2: teams1[3]._id,
      scheduledDateTime: matchDate2,
      court: 'Court 2',
      status: 'completed',
      score: {
        sets: [
          { team1: 6, team2: 4 },
          { team1: 6, team2: 2 }
        ],
        winner: teams1[2]._id,
        isCompleted: true
      },
      winner: teams1[2]._id,
      duration: 75,
      bracket: bracket1._id,
      bracketPosition: { round: 1, position: 2 }
    });

    console.log('✅ Created matches:', { 
      scheduledMatch: `Round ${match1.round} - Match ${match1.matchNumber}`, 
      completedMatch: `Round ${match2.round} - Match ${match2.matchNumber}` 
    });

    // Update tournament current players count
    await Tournament.findByIdAndUpdate(tournament1._id, { currentPlayers: players1.length });
    await Tournament.findByIdAndUpdate(tournament2._id, { currentPlayers: players2.length });

    console.log('🎯 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Users: 2 (1 admin, 1 organizer)`);
    console.log(`- Tournaments: 2 (1 singles, 1 doubles)`);
    console.log(`- Players: ${players1.length + players2.length}`);
    console.log(`- Teams: ${teams1.length + teams2.length}`);
    console.log(`- Brackets: 2`);
    console.log(`- Matches: 2`);
    
    console.log('\n🔍 Check your MongoDB Atlas interface for the "TennisTournamentManagement" database');
    console.log('📂 You should now see these collections:');
    console.log('   - users');
    console.log('   - tournaments');
    console.log('   - players');
    console.log('   - teams');
    console.log('   - matches');
    console.log('   - brackets');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the seeding function
seedData();