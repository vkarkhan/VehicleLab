import fs from 'fs';
if (!fs.existsSync('.next') || !fs.existsSync('.next/BUILD_ID')) {
  console.error('Next build artifacts missing');
  process.exit(1);
}
console.log('Smoke OK: .next and BUILD_ID found.');
