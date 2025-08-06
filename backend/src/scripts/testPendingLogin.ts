import mongoose from 'mongoose';
import User from '../models/User';
import { config } from 'dotenv';

// Load environment variables
config();

const testPendingLogin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tennistournament');
    console.log('Connected to MongoDB');

    // Create a test pending user with known password
    const testUser = await User.create({
      username: 'pendingtest',
      password: 'testpassword123',
      firstName: 'Pending',
      lastName: 'TestUser',
      role: 'club-organizer',
      approvalStatus: 'pending',
      isActive: true
    });

    console.log('✅ Created test pending user:');
    console.log(`Username: pendingtest`);
    console.log(`Password: testpassword123`);
    console.log(`Status: ${testUser.approvalStatus}`);
    console.log(`Role: ${testUser.role}`);

  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  testPendingLogin().then(() => process.exit(0));
}

export default testPendingLogin;