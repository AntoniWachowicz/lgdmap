// prebuild.js
const { execSync } = require('child_process');
const os = require('os');

console.log('Running prebuild script to install platform-specific dependencies...');

// Detect platform
const platform = os.platform();
const arch = os.arch();

console.log(`Platform: ${platform}, Architecture: ${arch}`);

try {
  // Try to install missing Rollup dependencies based on platform
  if (platform === 'linux') {
    // Install Linux-specific dependency
    console.log('Installing Linux-specific Rollup dependencies...');
    execSync('npm install --no-save @rollup/rollup-linux-x64-gnu', { stdio: 'inherit' });
  }
  // ...other platforms...
  
  console.log('Prebuild completed successfully!');
} catch (error) {
  console.error('Error during prebuild:', error.message);
  // Continue even if this fails - the build might still work
}