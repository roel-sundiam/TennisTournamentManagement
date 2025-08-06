// Test the timezone calculation logic to debug the issue

console.log('=== TIMEZONE CALCULATION TEST ===');

const timezoneOffsetHours = 8; // Philippines is UTC+8

// Test 6 PM local (18:00) conversion
const startHour = 18;
const startMin = 0;

console.log(`Input: ${startHour}:${String(startMin).padStart(2, '0')} local (6 PM Philippines)`);

// Our current logic
const utcStartHour = startHour - timezoneOffsetHours;
const adjustedStartHour = utcStartHour < 0 ? utcStartHour + 24 : utcStartHour;

console.log(`utcStartHour: ${startHour} - ${timezoneOffsetHours} = ${utcStartHour}`);
console.log(`adjustedStartHour: ${adjustedStartHour}`);

// Create the UTC time
const testDate = new Date('2025-07-23');
const currentTime = new Date(Date.UTC(testDate.getFullYear(), testDate.getMonth(), testDate.getDate(), adjustedStartHour, startMin, 0, 0));

console.log(`Created UTC time: ${currentTime.toISOString()}`);
console.log(`This should be: 2025-07-23T10:00:00.000Z for 6 PM local`);

// Verify by converting back
const localTime = new Date(currentTime.getTime() + (timezoneOffsetHours * 60 * 60 * 1000));
console.log(`Converting back to local: ${localTime.toISOString()}`);
console.log(`Local time check: ${localTime.getHours()}:${String(localTime.getMinutes()).padStart(2, '0')}`);

console.log('\n=== EXPECTED RESULTS ===');
console.log('6 PM local should store as 10:00 AM UTC');
console.log('Actual result:', currentTime.toISOString());

if (currentTime.toISOString().includes('T10:00:00.000Z')) {
  console.log('✅ Timezone calculation is CORRECT');
} else {
  console.log('❌ Timezone calculation is WRONG');
  console.log('Expected: 2025-07-23T10:00:00.000Z');
  console.log('Got:', currentTime.toISOString());
}