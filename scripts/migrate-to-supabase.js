#!/usr/bin/env node

/**
 * Ephemera: Automated Supabase Migration Runner
 * 
 * Usage:
 *   node scripts/migrate-to-supabase.js [optional_database_url]
 * or:
 *   npm run db:migrate
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 1. Resolve DATABASE_URL from arguments, process.env, or .env.local
let dbUrl = process.argv[2] || process.env.DATABASE_URL;

const envLocalPath = path.join(__dirname, '..', '.env.local');
if (!dbUrl && fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^DATABASE_URL=(.+)$/);
    if (match) {
      dbUrl = match[1].trim();
      break;
    }
  }
}

const isForce = process.argv.includes('--force');

console.log('\n======================================================');
console.log('       EPHEMERA — SUPABASE DATABASE MIGRATION');
console.log('======================================================\n');

if (!dbUrl || (!isForce && (dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1')))) {
  console.log('⚠️  No remote Supabase DATABASE_URL detected.');
  console.log('\nTo connect Ephemera to Supabase:');
  console.log('1. Go to your Supabase Project Dashboard (https://supabase.com/dashboard)');
  console.log('2. Navigate to: Project Settings -> Database');
  console.log('3. Scroll to "Connection String" and select "URI" (or Transaction/Session Pooler)');
  console.log('4. Copy the connection string (remember to replace [YOUR-PASSWORD] with your actual db password)');
  console.log('5. Add it to .env.local:');
  console.log('   DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"');
  console.log('\nAlternatively, you can run this script directly with your connection string:');
  console.log('   node scripts/migrate-to-supabase.js "your-supabase-connection-string"\n');
  process.exit(1);
}

// Mask password for display
const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':••••••••@');
console.log(`Connecting to: ${maskedUrl}`);

const isRemote = !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 10000,
});

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log('✓ Successfully connected to Supabase PostgreSQL database.');

    const migrationFile = path.join(__dirname, '..', 'supabase', 'full_migration.sql');
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found at: ${migrationFile}`);
    }

    console.log('✓ Reading migration script (supabase/full_migration.sql)...');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('✓ Executing schema creation, RLS policies, and data seeding...');
    await client.query(sql);
    console.log('✓ Migration SQL executed successfully.');

    // Verify row counts
    const counts = await client.query(`
      SELECT
        (SELECT count(*) FROM public.events) as events_count,
        (SELECT count(*) FROM public.submissions) as submissions_count,
        (SELECT count(*) FROM public.event_collaborators) as collaborators_count
    `);

    const { events_count, submissions_count, collaborators_count } = counts.rows[0];

    console.log('\n---------------- Verification ----------------');
    console.log(`Events in Supabase:        ${events_count}`);
    console.log(`Submissions in Supabase:   ${submissions_count}`);
    console.log(`Collaborators in Supabase: ${collaborators_count}`);
    console.log('----------------------------------------------\n');
    console.log('🎉 Shift to Supabase is complete! Your app is ready to use Supabase.');
  } catch (err) {
    console.error('\n❌ Migration failed with error:');
    console.error(err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('\nTip: Make sure you replaced [YOUR-PASSWORD] with the actual database password you created in Supabase.');
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
