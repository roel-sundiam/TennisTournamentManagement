import mongoose from 'mongoose';
import Tournament from '../models/Tournament';
import Club from '../models/Club';
import User from '../models/User';
import { config } from 'dotenv';

config();

async function checkTournaments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');
    
    const tournaments = await Tournament.find();
      
    console.log('🏆 All tournaments in database:');
    tournaments.forEach((t: any) => {
      console.log(`- ${t.name}`);
      console.log(`  Club ID: ${t.club}`);
      console.log(`  Organizer ID: ${t.organizer}`);
      console.log('');
    });
    
    const clubs = await Club.find();
    console.log('🏢 All clubs in database:');
    clubs.forEach((c: any) => {
      console.log(`- ${c.name} (ID: ${c._id})`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkTournaments();