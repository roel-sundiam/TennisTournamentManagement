const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://admin:Wowbot0411!1@mydb.zxr9i5k.mongodb.net/TennisTournamentManagement?retryWrites=true&w=majority&appName=MyDB');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Player schema (recreated based on the TypeScript model)
const playerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  skillLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'professional'],
    required: true,
    default: 'beginner'
  },
  ranking: {
    type: Number,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  notes: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  }
}, {
  timestamps: true
});

// Add virtual for full name
playerSchema.virtual('name').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const Player = mongoose.model('Player', playerSchema);

// Players list
const players = [
  'Roel Sundiam',
  'Homer Gallardo',
  'Derek Twano',
  'Mon Henson',
  'Larry Santos',
  'Mervin Nagun',
  'Jad Garbes',
  'Dan Castro',
  'Ismael Dela Paz',
  'Oyet Martin',
  'Jan Carlo Albano',
  'Mike Dunuan',
  'PJ Quiazon',
  'Bi Angeles',
  'Joey Espiritu',
  'Jon Galang',
  'Carl Manuntag',
  'Adrian Raphael Choi',
  'Rafael Pangilinan',
  'Carlos Naguit',
  'Matthew Gatpolintan',
  'John Puri',
  'Miguel Naguit',
  'Jermin David',
  'Eboy Villena',
  'Vonnel Manabat',
  'Marky Aquino Alcantara',
  'Dirk Esguerra',
  'Harvey David',
  'Ron Balboa',
  'Inigo Vergara Vicencio',
  'Jomar Alfonso',
  'Jau Timbol'
];

// Function to add players
const addPlayers = async () => {
  try {
    console.log('🔄 Starting to add players...');
    
    // Create player objects
    const playerObjects = players.map(name => {
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      return {
        firstName: firstName,
        lastName: lastName,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        phone: '+63912345678',
        skillLevel: 'beginner',
        ranking: 1,
        isActive: true,
        notes: `Added via bulk import on ${new Date().toISOString().split('T')[0]}`
      };
    });

    console.log(`📋 Prepared ${playerObjects.length} players for insertion`);
    
    // Check for existing players by firstName and lastName
    const existingPlayers = await Player.find({
      $or: playerObjects.map(p => ({
        firstName: p.firstName,
        lastName: p.lastName
      }))
    });
    
    console.log(`📊 Found ${existingPlayers.length} existing players`);
    
    // Filter out existing players
    const existingNames = existingPlayers.map(p => `${p.firstName} ${p.lastName}`);
    const newPlayers = playerObjects.filter(p => !existingNames.includes(`${p.firstName} ${p.lastName}`));
    
    console.log(`➕ Will add ${newPlayers.length} new players`);
    
    if (newPlayers.length === 0) {
      console.log('✅ All players already exist in the database');
      return;
    }
    
    // Insert new players
    const result = await Player.insertMany(newPlayers);
    
    console.log(`✅ Successfully added ${result.length} players to the database`);
    console.log('📋 Added players:');
    result.forEach((player, index) => {
      console.log(`  ${index + 1}. ${player.firstName} ${player.lastName} (${player.skillLevel})`);
    });
    
    // Show skipped players if any
    if (existingNames.length > 0) {
      console.log('⏭️  Skipped existing players:');
      existingNames.forEach((name, index) => {
        console.log(`  ${index + 1}. ${name}`);
      });
    }
    
    // Summary
    console.log('\n📊 Summary:');
    console.log(`   New players added: ${result.length}`);
    console.log(`   Existing players skipped: ${existingNames.length}`);
    console.log(`   Total players in list: ${players.length}`);
    
  } catch (error) {
    console.error('❌ Error adding players:', error);
    if (error.code === 11000) {
      console.error('💡 Duplicate key error - some players may already exist');
    }
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await addPlayers();
  
  console.log('\n🎾 Players addition complete!');
  console.log('💡 You can now register these players for your tournament.');
  
  // Close database connection
  await mongoose.connection.close();
  console.log('🔚 Database connection closed');
};

// Run the script
main().catch(error => {
  console.error('❌ Script execution failed:', error);
  process.exit(1);
});