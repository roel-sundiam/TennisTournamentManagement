const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/TennisTournamentManagement')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Create schedules collection manually
    const db = mongoose.connection.db;
    
    try {
      // Check existing collections
      const collections = await db.listCollections().toArray();
      console.log('Existing collections:', collections.map(c => c.name));
      
      // Create schedules collection if it doesn't exist
      if (!collections.find(c => c.name === 'schedules')) {
        await db.createCollection('schedules');
        console.log('✅ Created schedules collection');
      } else {
        console.log('📋 schedules collection already exists');
      }
      
      // Create timeslots collection if it doesn't exist
      if (!collections.find(c => c.name === 'timeslots')) {
        await db.createCollection('timeslots');
        console.log('✅ Created timeslots collection');
      } else {
        console.log('⏰ timeslots collection already exists');
      }
      
      // Test insert a simple document
      const testSchedule = {
        tournament: new mongoose.Types.ObjectId('6868e8c02f95d7cdb5ccbb7c'),
        name: 'Test Schedule',
        description: 'Test schedule creation',
        startDate: new Date(),
        endDate: new Date(),
        courts: [new mongoose.Types.ObjectId('1')],
        timeSlotDuration: 60,
        startTime: '09:00',
        endTime: '18:00',
        breakBetweenMatches: 10,
        totalMatches: 15,
        scheduledMatches: 15,
        conflicts: [],
        estimatedDuration: 8,
        status: 'draft',
        generatedAt: new Date()
      };
      
      const result = await db.collection('schedules').insertOne(testSchedule);
      console.log('✅ Test schedule inserted:', result.insertedId);
      
      // Check if it was saved
      const saved = await db.collection('schedules').findOne({_id: result.insertedId});
      console.log('📊 Saved schedule:', saved ? 'Found' : 'Not found');
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
    
    mongoose.connection.close();
    console.log('🔒 Connection closed');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });