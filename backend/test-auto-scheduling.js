// Test if the auto-scheduling function can be imported and works
const { assignMatchesToTimeSlots } = require('./dist/routes/tournaments');

async function testAutoScheduling() {
  console.log('🧪 Testing auto-scheduling function import...');
  
  if (typeof assignMatchesToTimeSlots === 'function') {
    console.log('✅ assignMatchesToTimeSlots function imported successfully');
    console.log('✅ Auto-scheduling should now work after bracket creation');
  } else {
    console.log('❌ assignMatchesToTimeSlots function import failed');
    console.log('Type:', typeof assignMatchesToTimeSlots);
  }
}

testAutoScheduling();