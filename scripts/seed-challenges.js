const { exec } = require('child_process');
const path = require('path');

const seedScript = path.join(__dirname, '../dist/challenges/seeds/seed-challenges.js');

console.log('Running challenge seeding script...');
exec(`node ${seedScript}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
});