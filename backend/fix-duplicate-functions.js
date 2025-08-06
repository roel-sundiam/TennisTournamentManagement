const fs = require('fs');

// Read the file
const filePath = '/mnt/c/Projects/TennisTournamentManagement/backend/src/routes/tournaments.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = content.split('\n');

// Find the first duplicate function (lines 81-431)
const firstDuplicateStart = 80; // 0-indexed, so line 81
const firstDuplicateEnd = 430; // 0-indexed, so line 431

// Remove the duplicate function
const fixedLines = [
  ...lines.slice(0, firstDuplicateStart),
  ...lines.slice(firstDuplicateEnd + 1)
];

// Write back to file
fs.writeFileSync(filePath, fixedLines.join('\n'));

console.log('✅ Removed duplicate function from lines 81-431');
console.log('📊 Original lines:', lines.length);
console.log('📊 Fixed lines:', fixedLines.length);
console.log('📊 Removed lines:', lines.length - fixedLines.length);