// server/src/utils/validate.js

function isEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function isNonEmptyString(str, minLen = 1, maxLen = 1000) {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

function isValidTimezone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
}

function isValidDate(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

module.exports = {
  isEmail,
  isNonEmptyString,
  isValidTimezone,
  isValidDate,
};
