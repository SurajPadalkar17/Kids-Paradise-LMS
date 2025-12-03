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

// Create public directory with a symlink to dist
const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  console.log('Creating public directory symlink to dist...');
  try {
    fs.symlinkSync(distDir, publicDir, 'dir');
    console.log('Created symlink: public -> dist');
  } catch (error) {
    console.log('Could not create symlink, creating public directory instead...');
    fs.mkdirSync(publicDir, { recursive: true });
    
    // Copy files from dist to public if they don't exist
    if (fs.existsSync(distDir)) {
      const files = fs.readdirSync(distDir);
      files.forEach(file => {
        const srcPath = path.join(distDir, file);
        const destPath = path.join(publicDir, file);
        if (!fs.existsSync(destPath)) {
          fs.copyFileSync(srcPath, destPath);
        }
      });
    }
  }
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
  
  // Ensure public directory has the latest build
  if (fs.existsSync(publicDir) && !fs.lstatSync(publicDir).isSymbolicLink()) {
    const files = fs.readdirSync(distDir);
    files.forEach(file => {
      const srcPath = path.join(distDir, file);
      const destPath = path.join(publicDir, file);
      
      // Remove existing file/directory
      if (fs.existsSync(destPath)) {
        if (fs.lstatSync(destPath).isDirectory()) {
          fs.rmSync(destPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(destPath);
        }
      }
      
      // Copy new file/directory
      if (fs.lstatSync(srcPath).isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        // Recursively copy directory contents
        const copyDir = (src, dest) => {
          const entries = fs.readdirSync(src, { withFileTypes: true });
          for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
              fs.mkdirSync(destPath, { recursive: true });
              copyDir(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
            }
          }
        };
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }
  
  console.log('Vite build completed successfully!');
} catch (error) {
  console.error('Error during build:', error);
  process.exit(1);
}
