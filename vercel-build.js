// vercel-build.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create dist directory if it doesn't exist
const distDir = path.join(process.cwd(), 'dist');
if (!fs.existsSync(distDir)) {
  console.log('Creating dist directory...');
  fs.mkdirSync(distDir, { recursive: true });
}

// Run the Vite build
console.log('Running Vite build...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  
  // Verify the build output
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    console.error('Error: Build completed but no index.html was found in dist directory');
    process.exit(1);
  }
  
  // For Vercel, we need to ensure the output is in the expected location
  // Copy all files from dist to the root of the output directory
  const copyRecursiveSync = (src, dest) => {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      fs.readdirSync(src).forEach(childItemName => {
        copyRecursiveSync(
          path.join(src, childItemName),
          path.join(dest, childItemName)
        );
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  };
  
  // Copy files to the root directory for Vercel
  const files = fs.readdirSync(distDir);
  files.forEach(file => {
    const srcPath = path.join(distDir, file);
    const destPath = path.join(process.cwd(), file);
    
    if (fs.existsSync(destPath)) {
      if (fs.lstatSync(destPath).isDirectory()) {
        fs.rmSync(destPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(destPath);
      }
    }
    
    copyRecursiveSync(srcPath, destPath);
  });
  
  console.log('Build output prepared for Vercel deployment');
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}
