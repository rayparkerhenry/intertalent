const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const port = process.env.PORT || 8080;

console.log('=== Azure App Service Startup ===');
console.log(`Current directory: ${__dirname}`);
console.log(`PORT: ${port}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// List root directory contents
console.log('Root directory contents:');
try {
  console.log(fs.readdirSync(__dirname).join(', '));
} catch (e) {
  console.log('Error reading root:', e.message);
}

// Check for .next folder
const nextDir = path.join(__dirname, '.next');
if (fs.existsSync(nextDir)) {
  console.log('.next folder contents:');
  console.log(fs.readdirSync(nextDir).join(', '));
} else {
  console.log('.next folder does NOT exist');
}

// Check if running in standalone mode
const standalonePath = path.join(__dirname, '.next', 'standalone', 'server.js');
console.log(`Looking for standalone server at: ${standalonePath}`);

if (fs.existsSync(standalonePath)) {
  console.log('Found standalone server, starting with spawn...');
  
  // Use spawn to run the standalone server as a child process
  const standaloneDir = path.join(__dirname, '.next', 'standalone');
  
  const child = spawn('node', ['server.js'], {
    cwd: standaloneDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port.toString(),
      HOSTNAME: '0.0.0.0',
    },
  });

  child.on('error', (err) => {
    console.error('Failed to start standalone server:', err);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    console.log(`Standalone server exited with code ${code}, signal ${signal}`);
    process.exit(code || 1);
  });

  // Keep the parent process alive
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    child.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    child.kill('SIGINT');
  });

} else {
  console.log('Standalone server not found, trying next start...');
  
  // Fallback: use next start directly
  const child = spawn('npx', ['next', 'start', '-p', port.toString(), '-H', '0.0.0.0'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });

  child.on('error', (err) => {
    console.error('Failed to start next:', err);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    console.log(`Next.js exited with code ${code}, signal ${signal}`);
    process.exit(code || 1);
  });
}
