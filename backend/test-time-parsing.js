// Test time parsing logic to identify 6PM-10PM issue

function testTimeParsing() {
  console.log('=== TIME PARSING TEST ===');
  
  // Test different time formats
  const testTimes = [
    { label: 'Morning (9AM-6PM)', start: '09:00', end: '18:00' },
    { label: 'Evening (6PM-10PM)', start: '18:00', end: '22:00' },
    { label: 'Bad format 1', start: '6:00', end: '10:00' },
    { label: 'Bad format 2', start: '18', end: '22' },
    { label: 'Empty', start: '', end: '' }
  ];
  
  testTimes.forEach(test => {
    console.log(`\n--- Testing: ${test.label} ---`);
    console.log(`Input: start="${test.start}", end="${test.end}"`);
    
    try {
      // Replicate the parsing logic from scheduling.ts line 764-765
      const [startHour, startMin] = test.start.split(':').map(Number);
      const [endHour, endMin] = test.end.split(':').map(Number);
      
      console.log(`Parsed: startHour=${startHour}, startMin=${startMin}, endHour=${endHour}, endMin=${endMin}`);
      
      // Check for NaN values
      if (isNaN(startHour) || isNaN(startMin) || isNaN(endHour) || isNaN(endMin)) {
        console.log('❌ PARSING FAILED - NaN values detected');
      } else {
        console.log('✅ Parsing successful');
        
        // Test time slot generation
        const testDate = new Date('2025-07-17');
        
        const currentTime = new Date(testDate);
        currentTime.setHours(startHour, startMin, 0, 0);
        
        const dayEndTime = new Date(testDate);
        dayEndTime.setHours(endHour, endMin, 0, 0);
        
        console.log(`Times: ${currentTime.toLocaleString()} to ${dayEndTime.toLocaleString()}`);
        
        if (currentTime >= dayEndTime) {
          console.log('❌ LOGIC ERROR - Start time >= End time');
        } else {
          console.log('✅ Time range valid');
        }
      }
      
    } catch (error) {
      console.log('❌ EXCEPTION:', error.message);
    }
  });
}

testTimeParsing();