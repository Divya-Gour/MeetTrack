// server/src/server.js
const http = require('http');
const config = require('./config');
const { connectDB, disconnectDB } = require('./db');
const app = require('./app');
const { startScheduler, stopScheduler } = require('./jobs/scheduler');

async function start() {
  try {
    await connectDB();

    const server = http.createServer(app);

    server.listen(config.port, () => {
      console.log(`[MeetTrack Server] Listening on http://localhost:${config.port} (env: ${config.nodeEnv})`);
    });

    if (config.nodeEnv !== 'test') {
      startScheduler();
    }

    const shutdown = async (signal) => {
      console.log(`[MeetTrack Server] Received ${signal}. Shutting down gracefully...`);
      stopScheduler();
      server.close(async () => {
        await disconnectDB();
        console.log('[MeetTrack Server] Closed successfully.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('[MeetTrack Server FATAL]:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { start };
