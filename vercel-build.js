// vercel-build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir);
}

// Run the Vite build
console.log('Running Vite build...');
try {
  execSync('vite build', { stdio: 'inherit' });
  
  // Verify the build output
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('Error: Build completed but no index.html was found in dist directory');
    process.exit(1);
  }
  
  console.log('Vite build completed successfully!');
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}
