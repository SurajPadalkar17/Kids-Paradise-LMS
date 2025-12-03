// vercel-build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create public directory if it doesn't exist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory...');
  fs.mkdirSync(publicDir);
}

// Create a simple index.html file in the public directory
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.log('Creating index.html in public directory...');
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

// Run the Vite build
console.log('Running Vite build...');
execSync('vite build', { stdio: 'inherit' });

console.log('Build completed successfully!');
