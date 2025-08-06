const fetch = require('node-fetch');

async function testAutoScheduleAPI() {
  try {
    console.log('🧪 TESTING AUTO-SCHEDULE VIA API');
    
    // Test tournament data with auto-scheduling enabled
    const tournamentData = {
      name: 'API Auto-Schedule Test',
      description: 'Testing auto-schedule via API',
      startDate: '2025-07-25',
      endDate: '2025-07-26',
      format: 'single-elimination',
      gameType: 'doubles',
      gameFormat: 'tiebreak-10',
      maxPlayers: 8,
      requiredCourts: 2,
      venue: 'Test Venue',
      // Auto-scheduling fields
      autoScheduleEnabled: true,
      dailyStartTime: '18:00',
      dailyEndTime: '22:00',
      availableCourts: ['Court 1', 'Court 2'],
      matchDuration: 60
    };
    
    console.log('1️⃣ Creating tournament via API...');
    console.log('Data:', JSON.stringify(tournamentData, null, 2));
    
    const response = await fetch('http://localhost:3000/api/tournaments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tournamentData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Tournament created via API');
      console.log('Tournament ID:', result.data._id);
      console.log('Auto-schedule generated:', result.autoScheduleGenerated);
      
      if (result.autoScheduleGenerated) {
        console.log('🎯 AUTO-SCHEDULE API TEST PASSED!');
        console.log('✅ Tournament creation with auto-scheduling works');
        console.log('✅ Frontend can now use the enhanced tournament form');
      } else {
        console.log('❌ Auto-schedule not generated');
      }
      
      // Test with auto-scheduling disabled
      console.log('\n2️⃣ Testing without auto-scheduling...');
      
      const tournamentDataNoAuto = {
        ...tournamentData,
        name: 'No Auto-Schedule Test',
        autoScheduleEnabled: false
      };
      
      const response2 = await fetch('http://localhost:3000/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tournamentDataNoAuto)
      });
      
      const result2 = await response2.json();
      
      if (response2.ok) {
        console.log('✅ Tournament created without auto-scheduling');
        console.log('Auto-schedule generated:', result2.autoScheduleGenerated);
        
        if (!result2.autoScheduleGenerated) {
          console.log('✅ Correctly skipped auto-scheduling when disabled');
        }
      }
      
    } else {
      console.log('❌ API request failed');
      console.log('Error:', result);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAutoScheduleAPI();