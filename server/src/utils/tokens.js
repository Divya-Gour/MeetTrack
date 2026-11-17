// server/src/utils/tokens.js
const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateToken,
  hashToken,
};
