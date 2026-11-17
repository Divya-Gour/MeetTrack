// server/tests/setup.js
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/db');
const app = require('../src/app');

async function initTestDb() {
  process.env.NODE_ENV = 'test';
  await connectDB(process.env.MONGODB_URI || 'mongodb://localhost:27017/meettrack_test');
}

async function clearTestDb() {
  if (mongoose.connection && mongoose.connection.db) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const col of collections) {
      await mongoose.connection.db.collection(col.name).deleteMany({});
    }
  }
}

async function closeTestDb() {
  await clearTestDb();
  await disconnectDB();
}

module.exports = {
  app,
  initTestDb,
  clearTestDb,
  closeTestDb,
};
