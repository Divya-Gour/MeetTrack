// server/src/middleware/session.js
const session = require('express-session');
const MongoStore = require('connect-mongo');
const config = require('../config');

const sessionMiddleware = session({
  name: 'mt.sid',
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: config.mongodbUri,
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60, // 7 days in seconds
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  },
});

module.exports = sessionMiddleware;
