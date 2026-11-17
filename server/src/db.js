// server/src/db.js
const mongoose = require('mongoose');
const config = require('./config');

let isConnected = false;

async function connectDB(customUri) {
  if (isConnected) return mongoose.connection;
  const uri = customUri || config.mongodbUri;

  try {
    await mongoose.connect(uri);
    isConnected = true;
    if (!config.isTest) {
      console.log(`[DB] Connected to MongoDB at ${uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:[redacted]@')}`);
    }
    return mongoose.connection;
  } catch (err) {
    console.error('[DB FATAL] Failed to connect to MongoDB:', err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

module.exports = {
  connectDB,
  disconnectDB,
};
