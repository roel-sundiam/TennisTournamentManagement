const mongoose = require('mongoose');
require('dotenv').config();

async function fixHarveyAdvancement() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    const tournamentId = '6878d6d4dfdf2780f694db4a';
    
    console.log('\n🔧 FIXING HARVEY DAVID ADVANCEMENT');
    console.log(`Tournament ID: ${tournamentId}`);
    
    // Get the specific matches we need to fix
    const harveyTeamId = '6878d7a7dfdf2780f694df8a'; // Harvey David/Jad Garbes
    const round2Match2Id = '6878d7bedfdf2780f694e101'; // Round 2 Match 2
    
    console.log(`Harvey's Team ID: ${harveyTeamId}`);
    console.log(`Round 2 Match 2 ID: ${round2Match2Id}`);
    
    // Verify Harvey won Round 1 Match 3
    const harveyRound1Match = await db.collection('matches').findOne({
      _id: new mongoose.Types.ObjectId('6878d7bcdfdf2780f694e0f0')
    });
    
    if (harveyRound1Match && harveyRound1Match.winner && harveyRound1Match.winner.toString() === harveyTeamId) {
      console.log('✅ Confirmed: Harvey won Round 1 Match 3');
      
      // Check current state of Round 2 Match 2
      const round2Match2 = await db.collection('matches').findOne({
        _id: new mongoose.Types.ObjectId(round2Match2Id)
      });
      
      if (round2Match2) {
        console.log('\n📋 Current Round 2 Match 2 state:');
        console.log(`  Team1: ${round2Match2.team1 || 'null'}`);
        console.log(`  Team2: ${round2Match2.team2 || 'null'}`);
        console.log(`  Status: ${round2Match2.status}`);
        
        if (!round2Match2.team1) {
          console.log('\n🔧 Fixing Round 2 Match 2...');
          
          // Update Round 2 Match 2 to include Harvey's team as team1
          const updateResult = await db.collection('matches').updateOne(
            { _id: new mongoose.Types.ObjectId(round2Match2Id) },
            {
              $set: {
                team1: new mongoose.Types.ObjectId(harveyTeamId),
                status: 'scheduled', // Change from pending to scheduled
                updatedAt: new Date()
              }
            }
          );
          
          if (updateResult.modifiedCount > 0) {
            console.log('✅ Successfully updated Round 2 Match 2');
            console.log(`   Added Harvey's team as team1`);
            console.log(`   Status changed to scheduled`);
            
            // Verify the fix
            const verifyMatch = await db.collection('matches').findOne({
              _id: new mongoose.Types.ObjectId(round2Match2Id)
            });
            
            console.log('\n🔍 Verification:');
            console.log(`  Team1: ${verifyMatch.team1}`);
            console.log(`  Team2: ${verifyMatch.team2}`);
            console.log(`  Status: ${verifyMatch.status}`);
            
            // Get team names for display
            const teams = await db.collection('teams').find({
              _id: { $in: [verifyMatch.team1, verifyMatch.team2] }
            }).toArray();
            
            const teamMap = {};
            teams.forEach(team => {
              teamMap[team._id.toString()] = team.name;
            });
            
            console.log('\n📋 Round 2 Match 2 now shows:');
            console.log(`   ${teamMap[verifyMatch.team1.toString()]} vs ${teamMap[verifyMatch.team2.toString()]}`);
            
          } else {
            console.log('❌ Failed to update Round 2 Match 2');
          }
        } else {
          console.log('✅ Round 2 Match 2 already has team1 set');
        }
      } else {
        console.log('❌ Round 2 Match 2 not found');
      }
    } else {
      console.log('❌ Harvey did not win Round 1 Match 3, cannot advance');
    }
    
    console.log('\n🎯 ADVANCEMENT FIX COMPLETE!');
    console.log('✅ Harvey David/Jad Garbes should now appear in Round 2 Match 2');
    console.log('✅ Check the bracket tree to verify the fix');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixHarveyAdvancement();