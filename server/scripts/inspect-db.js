// server/scripts/inspect-db.js
// Database inspector for MeetTrack

const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Check server/.env');
  process.exit(1);
}

// Redaction rule: Password, hash, token, secret, session and salt fields always show as [redacted]
const REDACT_KEY_REGEX = /password|hash|token|secret|session|salt/i;

function toPlain(val) {
  if (val === null || val === undefined) return val;
  if (typeof val === 'function') return undefined;

  // Handle Mongoose Document
  if (typeof val.toObject === 'function') {
    val = val.toObject({ virtuals: false });
  }

  // Handle ObjectId
  if (val._bsontype === 'ObjectID' || (val.constructor && val.constructor.name === 'ObjectId')) {
    return val.toString();
  }

  // Handle Date
  if (val instanceof Date) {
    return val.toISOString();
  }

  // Handle Array
  if (Array.isArray(val)) {
    return val.map((item) => toPlain(item));
  }

  // Handle Object
  if (typeof val === 'object') {
    const plain = {};
    for (const [k, v] of Object.entries(val)) {
      plain[k] = toPlain(v);
    }
    return plain;
  }

  return val;
}

function redact(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redact(item));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (REDACT_KEY_REGEX.test(key)) {
      result[key] = '[redacted]';
    } else if (value && typeof value === 'object') {
      result[key] = redact(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI);

    const args = process.argv.slice(2);
    const isJson = args.includes('--json');
    const filteredArgs = args.filter((a) => a !== '--json');

    const collectionName = filteredArgs[0];
    const limitArg = filteredArgs[1];
    let limit = 3;
    if (limitArg) {
      const parsed = parseInt(limitArg, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    }

    const db = mongoose.connection.db;

    if (!collectionName) {
      // List all collections with document counts
      const collections = await db.listCollections().toArray();
      const stats = [];

      for (const col of collections) {
        const count = await db.collection(col.name).countDocuments();
        stats.push({ collection: col.name, count });
      }

      stats.sort((a, b) => a.collection.localeCompare(b.collection));

      if (isJson) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log('\n--- MeetTrack Collections & Counts ---');
        if (stats.length === 0) {
          console.log('(No collections found in database yet)');
        } else {
          console.table(stats);
        }
        console.log(`Total collections: ${stats.length}\n`);
      }
    } else {
      // Inspect specific collection
      const collection = db.collection(collectionName);
      const rawDocs = await collection
        .find({})
        .sort({ _id: -1 })
        .limit(limit)
        .toArray();

      const sanitizedDocs = rawDocs.map((doc) => redact(toPlain(doc)));

      if (isJson) {
        console.log(JSON.stringify(sanitizedDocs, null, 2));
      } else {
        console.log(`\n--- Most recent ${sanitizedDocs.length} document(s) in '${collectionName}' ---`);
        if (sanitizedDocs.length === 0) {
          console.log(`(Collection '${collectionName}' is empty or does not exist)`);
        } else {
          sanitizedDocs.forEach((doc, idx) => {
            console.log(`\n[#${idx + 1}] ID: ${doc._id}`);
            console.dir(doc, { depth: null, colors: true });
          });
        }
        console.log('');
      }
    }
  } catch (err) {
    console.error('Inspection failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

inspect();
