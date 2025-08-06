import mongoose from 'mongoose';
import { config } from 'dotenv';

// Import models to register them with Mongoose
import '../models/User';
import '../models/Club';
import '../models/Tournament';
import '../models/Player';
import '../models/PlayerRegistration';
import '../models/Team';
import '../models/Match';
import '../models/Bracket';
import '../models/Court';
import '../models/TimeSlot';
import '../models/Schedule';

import Tournament from '../models/Tournament';
import Match from '../models/Match';

config();

async function debugMatchesView() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    // Get all tournaments
    const tournaments = await Tournament.find();
    console.log('📋 Found tournaments:', tournaments.length);

    for (const tournament of tournaments) {
      console.log(`\n🏆 Tournament: ${tournament.name} (ID: ${tournament._id})`);
      
      // Get matches for this tournament
      const matches = await Match.find({ tournament: tournament._id })
        .populate('team1', 'name players')
        .populate('team2', 'name players')
        .populate('court', 'name')
        .sort({ round: 1, matchNumber: 1 });

      console.log(`📊 Raw matches response for ${tournament.name}:`, matches.length, 'matches');

      // Debug each match for scheduled data
      matches.forEach((match: any, index: number) => {
        console.log(`🔍 Match ${index + 1}:`, {
          id: match._id,
          round: match.round,
          matchNumber: match.matchNumber,
          scheduledDateTime: match.scheduledDateTime,
          scheduledTimeSlot: match.scheduledTimeSlot,
          court: match.court,
          status: match.status,
          team1: match.team1?.name || 'Team 1',
          team2: match.team2?.name || 'Team 2'
        });
      });

      // Simulate the organizeMatchesByDay function
      console.log('📅 Organizing matches by day:', matches.length, 'matches');
      console.log('📅 Raw matches data:', matches);
      
      const dayGroups: { [date: string]: any[] } = {};
      
      matches.forEach((match: any, index: number) => {
        console.log(`📅 Processing match ${index + 1}:`, {
          id: match._id,
          scheduledDateTime: match.scheduledDateTime,
          round: match.round,
          matchNumber: match.matchNumber,
          team1: match.team1?.name,
          team2: match.team2?.name
        });
        
        if (match.scheduledDateTime) {
          // Match has specific schedule time
          const date = new Date(match.scheduledDateTime).toDateString();
          console.log(`📅 Adding match to date group: ${date}`);
          if (!dayGroups[date]) {
            dayGroups[date] = [];
          }
          dayGroups[date].push(match);
        } else {
          // Match doesn't have specific time, add to "Scheduled Matches" group
          const defaultDate = 'Scheduled Matches';
          console.log(`📅 Adding match to default group: ${defaultDate}`);
          if (!dayGroups[defaultDate]) {
            dayGroups[defaultDate] = [];
          }
          dayGroups[defaultDate].push(match);
        }
      });

      const matchesByDay = Object.keys(dayGroups).map(date => ({
        date,
        matches: dayGroups[date].sort((a, b) => {
          // Sort by scheduledDateTime if available, otherwise by round and matchNumber
          if (a.scheduledDateTime && b.scheduledDateTime) {
            return new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime();
          } else {
            // Sort by round first, then by match number
            if (a.round !== b.round) {
              return a.round - b.round;
            }
            return a.matchNumber - b.matchNumber;
          }
        })
      }));
      
      // These are the specific debug logs you requested
      console.log('📊 Final matchesByDay:', matchesByDay);
      console.log('📊 Number of day groups:', matchesByDay.length);
      console.log('📊 Day groups details:', matchesByDay.map(g => ({
        date: g.date, 
        matchCount: g.matches.length
      })));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

debugMatchesView();