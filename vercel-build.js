// vercel-build.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process...');

// Create public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir);
}

// Create a placeholder index.html if it doesn't exist
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('Creating placeholder index.html...');
  fs.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
<head>
    <title>Kids Paradise</title>
</head>
<body>
    <p>Loading...</p>
    <script>window.location.href = '/index.html';</script>
</body>
</html>`);
}

// Run Vite build
console.log('Running Vite build...');
execSync('vite build', { stdio: 'inherit' });

console.log('Vercel build completed successfully!');
