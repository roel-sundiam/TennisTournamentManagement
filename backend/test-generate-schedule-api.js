const axios = require('axios');

async function testGenerateScheduleAPI() {
  try {
    console.log('🧪 Testing Generate Schedule API...');
    
    const tournamentId = '6879c294b64b6d92bcfeeb6e';
    const url = `http://localhost:3000/api/tournaments/${tournamentId}/generate-schedule`;
    
    console.log('📞 Making POST request to:', url);
    
    const response = await axios.post(url, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success Response:', response.data);
    
  } catch (error) {
    console.log('❌ Error Response:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    
    if (error.code === 'ECONNREFUSED') {
      console.log('🔌 Server not running - start with: npm run dev');
    }
  }
}

testGenerateScheduleAPI();