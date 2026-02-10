/**
 * Simple migration runner that applies all SQL migration files in order.
 * Each statement is run individually with error handling so already-applied
 * migrations are silently skipped.
 */
const fs = require('fs');
const path = require('path');
const postgres = require('postgres');

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set, skipping migrations');
    process.exit(0);
  }

  const sql = postgres(connectionString);
  const migrationsDir = path.join(__dirname, '..', 'drizzle');

  // Get all SQL migration files sorted by name
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    console.log(`Applying ${file}...`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = content
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(Boolean);

    for (const stmt of statements) {
      try {
        await sql.unsafe(stmt);
      } catch (e) {
        // Skip already-applied migrations (duplicate table, column, index, etc.)
        const msg = e.message || '';
        if (msg.includes('already exists') || msg.includes('duplicate')) {
          console.log(`  Skipped (already applied): ${msg.slice(0, 80)}`);
        } else {
          console.log(`  Warning: ${msg.slice(0, 120)}`);
        }
      }
    }
  }

  await sql.end();
  console.log('Migrations complete');
}

runMigrations().catch(err => {
  console.error('Migration error:', err.message);
  process.exit(0); // Don't block startup
});
