// vercel-build.js
const { execSync } = require('child_process');

console.log('Starting Vercel build...');

try {
  // Run the build command
  console.log('Running build command...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
