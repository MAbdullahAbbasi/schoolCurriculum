/**
 * Backfill / sync application updates from GitHub (or local git).
 * Usage: node scripts/syncAppUpdates.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { syncAppUpdatesFromSource } from '../utils/githubCommits.js';

dotenv.config();

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected. Syncing updates…');
  const stats = await syncAppUpdatesFromSource();
  console.log('Sync complete:', stats);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});
