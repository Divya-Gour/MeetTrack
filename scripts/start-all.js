// scripts/start-all.js
// Runs both the Node.js backend server and Vite client concurrently with direct process hygiene
const { spawn, execSync } = require('child_process');
const path = require('path');
const net = require('net');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const clientDir = path.join(rootDir, 'client');
const viteBin = path.join(clientDir, 'node_modules', 'vite', 'bin', 'vite.js');

// Free port reliably using native OS commands
function freePort(port) {
  try {
    if (process.platform === 'win32') {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: 'ignore' }
      );
    } else {
      execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
    }
  } catch (_) { }
}

// Verify MongoDB availability
function checkMongo() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(27017, '127.0.0.1');
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('       MEETTRACK FULL-STACK DEVELOPMENT RUNNER         ');
  console.log('======================================================\n');

  // 1. Verify MongoDB
  const mongoUp = await checkMongo();
  if (mongoUp) {
    console.log('\x1b[32m✔ [MongoDB]\x1b[0m Connected and active on 127.0.0.1:27017');
  } else {
    console.warn('\x1b[33m▲ [MongoDB]\x1b[0m 127.0.0.1:27017 is not responding.');
    console.warn('  Ensure your MongoDB daemon is running before making API calls.');
  }

  // 2. Free ports 4000 and 5173 from any stale background processes
  freePort(4000);
  freePort(5173);

  console.log('\x1b[36m[MeetTrack]\x1b[0m Starting Backend (:4000) and Frontend (:5173)...\n');

  // 3. Launch Backend directly with node (no shell wrapper)
  const server = spawn(process.execPath, ['--watch', 'src/server.js'], {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });

  // 4. Launch Vite directly with node
  const clientArgs = fs.existsSync(viteBin) ? [viteBin] : ['run', 'dev'];
  const clientCmd = fs.existsSync(viteBin) ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const client = spawn(clientCmd, clientArgs, {
    cwd: clientDir,
    stdio: 'inherit',
    env: { ...process.env },
  });

  server.on('error', (err) => {
    console.error('\x1b[31m[Server Error]\x1b[0m', err.message);
  });

  client.on('error', (err) => {
    console.error('\x1b[31m[Client Error]\x1b[0m', err.message);
  });

  let exiting = false;
  function cleanup() {
    if (exiting) return;
    exiting = true;
    console.log('\n\x1b[33m[MeetTrack] Shutting down services cleanly...\x1b[0m');

    try {
      if (server && !server.killed) {
        if (process.platform === 'win32') {
          try { execSync(`taskkill /PID ${server.pid} /F /T`, { stdio: 'ignore' }); } catch (_) { }
        } else {
          server.kill('SIGTERM');
        }
      }
    } catch (_) { }

    try {
      if (client && !client.killed) {
        if (process.platform === 'win32') {
          try { execSync(`taskkill /PID ${client.pid} /F /T`, { stdio: 'ignore' }); } catch (_) { }
        } else {
          client.kill('SIGTERM');
        }
      }
    } catch (_) { }

    process.exit(0);
  }

  server.on('close', (code) => {
    if (!exiting) {
      console.log(`[MeetTrack] Server process exited with code ${code}`);
      cleanup();
    }
  });

  client.on('close', (code) => {
    if (!exiting) {
      console.log(`[MeetTrack] Client process exited with code ${code}`);
      cleanup();
    }
  });

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Keep event loop active until SIGINT or SIGTERM
  setInterval(() => { }, 1000 * 60 * 60);
}

main();
