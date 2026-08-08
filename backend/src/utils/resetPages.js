import '../config/env.js';
import dns from 'dns';
import mongoose from 'mongoose';

dns.setServers(['8.8.8.8', '1.1.1.1']);

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('MONGO_URI not found in .env');
  process.exit(1);
}

const conn = await mongoose.connect(uri);
const r = await conn.connection.db.collection('pages').deleteMany({});
console.log('Deleted', r.deletedCount, 'old pages — new defaults will auto-create on next API call');
await mongoose.disconnect();
process.exit(0);
