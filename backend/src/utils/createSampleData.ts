import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/database';

// Load environment variables
dotenv.config();
import Tournament from '../models/Tournament';
import Team from '../models/Team';
import Match from '../models/Match';
import Player from '../models/Player';
import Bracket from '../models/Bracket';
import User from '../models/User';
import { TennisScoringService } from '../services/tennisScoring';

/**
 * Create sample tournament data for testing live scoring
 */
async function createSampleData() {
  try {
    console.log('🎾 Creating sample tournament data...');
    
    // Connect to database
    await connectDB();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await Match.deleteMany({});
    await Team.deleteMany({});
    await Player.deleteMany({});
    await Tournament.deleteMany({});
    await Bracket.deleteMany({});
    await User.deleteMany({});
    
    // Create a sample organizer user
    console.log('Creating organizer...');
    const organizer = new User({
      username: 'testorganizer',
      firstName: 'Test',
      lastName: 'Organizer',
      email: 'organizer@test.com',
      password: 'password123', // This will be hashed by the model
      role: 'organizer'
    });
    await organizer.save();
    console.log('✅ Organizer created');
    
    // Create a sample tournament
    console.log('Creating tournament...');
    const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
    const tournament = new Tournament({
      name: 'Live Scoring Test Tournament',
      description: 'Sample tournament for testing live scoring features',
      startDate: startDate,
      endDate: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days after start
      registrationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
      maxPlayers: 8,
      currentPlayers: 0,
      format: 'single-elimination',
      gameType: 'singles',
      status: 'in-progress',
      entryFee: 0,
      prizePool: 0,
      venue: 'Test Tennis Center',
      rules: 'Best of 3 sets',
      organizer: organizer._id
    });
    await tournament.save();
    console.log('✅ Tournament created:', tournament.name);
    
    // Create sample players
    console.log('Creating players...');
    const playersData = [
      { firstName: 'Rafael', lastName: 'Nadal', email: 'rafael@test.com', ranking: 1 },
      { firstName: 'Roger', lastName: 'Federer', email: 'roger@test.com', ranking: 2 },
      { firstName: 'Serena', lastName: 'Williams', email: 'serena@test.com', ranking: 3 },
      { firstName: 'Novak', lastName: 'Djokovic', email: 'novak@test.com', ranking: 4 },
      { firstName: 'Maria', lastName: 'Sharapova', email: 'maria@test.com', ranking: 5 },
      { firstName: 'Andy', lastName: 'Murray', email: 'andy@test.com', ranking: 6 }
    ];
    
    const createdPlayers = [];
    for (const playerData of playersData) {
      const player = new Player({
        ...playerData,
        tournament: tournament._id,
        skillLevel: 'intermediate',
        registrationDate: new Date(),
        isActive: true
      });
      await player.save();
      createdPlayers.push(player);
    }
    console.log('✅ Players created:', createdPlayers.length);
    
    // Create teams (for singles, each team has one player)
    console.log('Creating teams...');
    const teams = [];
    for (const player of createdPlayers) {
      const team = new Team({
        name: `${player.firstName} ${player.lastName}`,
        players: [player._id],
        tournament: tournament._id,
        averageSkillLevel: player.skillLevel
      });
      await team.save();
      teams.push(team);
    }
    console.log('✅ Teams created:', teams.length);
    
    // Create a bracket
    console.log('Creating bracket...');
    const totalTeams = teams.length;
    const totalRounds = Math.ceil(Math.log2(totalTeams));
    
    const bracket = new Bracket({
      tournament: tournament._id,
      name: 'Main Draw',
      format: 'single-elimination',
      teams: teams.map(t => t._id),
      totalTeams: totalTeams,
      totalRounds: totalRounds,
      status: 'in-progress'
    });
    await bracket.save();
    console.log('✅ Bracket created');
    
    // Create sample matches with different statuses
    console.log('Creating matches...');
    
    // Match 1: In progress with some score
    const match1 = new Match({
      tournament: tournament._id,
      round: 1,
      matchNumber: 1,
      team1: teams[0]._id,
      team2: teams[1]._id,
      status: 'in-progress',
      court: 'Center Court',
      bracket: bracket._id,
      bracketPosition: { round: 1, position: 1 },
      matchFormat: 'best-of-3',
      score: {
        tennisScore: TennisScoringService.initializeScore('best-of-3'),
        isCompleted: false,
        startTime: new Date(Date.now() - 3600000) // Started 1 hour ago
      }
    });
    
    // Add some points to the match
    match1.score.tennisScore = TennisScoringService.awardPoint(match1.score.tennisScore, 'team1', 'best-of-3');
    match1.score.tennisScore = TennisScoringService.awardPoint(match1.score.tennisScore, 'team1', 'best-of-3');
    match1.score.tennisScore = TennisScoringService.awardPoint(match1.score.tennisScore, 'team2', 'best-of-3');
    match1.score.tennisScore = TennisScoringService.awardPoint(match1.score.tennisScore, 'team1', 'best-of-3');
    
    await match1.save();
    console.log('✅ Match 1 created (in-progress)');
    
    // Match 2: In progress with different score
    const match2 = new Match({
      tournament: tournament._id,
      round: 1,
      matchNumber: 2,
      team1: teams[2]._id,
      team2: teams[3]._id,
      status: 'in-progress',
      court: 'Court 2',
      bracket: bracket._id,
      bracketPosition: { round: 1, position: 2 },
      matchFormat: 'best-of-3',
      score: {
        tennisScore: TennisScoringService.initializeScore('best-of-3'),
        isCompleted: false,
        startTime: new Date(Date.now() - 1800000) // Started 30 minutes ago
      }
    });
    
    // Add more points to match 2
    for (let i = 0; i < 10; i++) {
      match2.score.tennisScore = TennisScoringService.awardPoint(match2.score.tennisScore, i % 2 === 0 ? 'team1' : 'team2', 'best-of-3');
    }
    
    await match2.save();
    console.log('✅ Match 2 created (in-progress)');
    
    // Match 3: Scheduled
    const match3 = new Match({
      tournament: tournament._id,
      round: 1,
      matchNumber: 3,
      team1: teams[4]._id,
      team2: teams[5]._id,
      status: 'scheduled',
      court: 'Court 3',
      bracket: bracket._id,
      bracketPosition: { round: 1, position: 3 },
      matchFormat: 'best-of-3',
      scheduledDateTime: new Date(Date.now() + 3600000), // 1 hour from now
      score: {
        tennisScore: TennisScoringService.initializeScore('best-of-3'),
        isCompleted: false
      }
    });
    
    await match3.save();
    console.log('✅ Match 3 created (scheduled)');
    
    console.log('\n🎉 Sample data created successfully!');
    console.log('📊 Summary:');
    console.log(`- Tournament: ${tournament.name}`);
    console.log(`- Players: ${createdPlayers.length}`);
    console.log(`- Teams: ${teams.length}`);
    console.log(`- Live Matches: 2`);
    console.log(`- Scheduled Matches: 1`);
    console.log('\n🎾 You can now test live scoring with real data!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
  } finally {
    process.exit();
  }
}

// Run the script
if (require.main === module) {
  createSampleData();
}

export { createSampleData };