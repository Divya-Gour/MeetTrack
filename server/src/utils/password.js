// server/src/utils/password.js
const crypto = require('crypto');

/**
 * Validates password rules per Section 4:
 * at least 8 characters, one number, one symbol, not containing the email address.
 */
function validatePassword(password, email = '') {
  const failedRules = [];

  if (!password || password.length < 8) {
    failedRules.push('Password must be at least 8 characters long.');
  }

  if (!/\d/.test(password)) {
    failedRules.push('Password must contain at least one number.');
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    failedRules.push('Password must contain at least one symbol.');
  }

  if (email && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    const emailName = cleanEmail.split('@')[0];
    const lowerPass = (password || '').toLowerCase();
    if (lowerPass.includes(cleanEmail) || (emailName.length >= 3 && lowerPass.includes(emailName))) {
      failedRules.push('Password must not contain your email address.');
    }
  }

  return {
    valid: failedRules.length === 0,
    failedRules,
  };
}

/**
 * Hashes password using crypto.scrypt with a 16-byte random salt and 64-byte key.
 */
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve({
        hash: derivedKey.toString('hex'),
        salt,
      });
    });
  });
}

/**
 * Verifies password using crypto.timingSafeEqual.
 */
function verifyPassword(password, storedHash, storedSalt) {
  return new Promise((resolve, reject) => {
    if (!password || !storedHash || !storedSalt) {
      return resolve(false);
    }
    crypto.scrypt(password, storedSalt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      try {
        const storedBuffer = Buffer.from(storedHash, 'hex');
        if (storedBuffer.length !== derivedKey.length) {
          return resolve(false);
        }
        const match = crypto.timingSafeEqual(storedBuffer, derivedKey);
        resolve(match);
      } catch (e) {
        resolve(false);
      }
    });
  });
}

module.exports = {
  validatePassword,
  hashPassword,
  verifyPassword,
};
