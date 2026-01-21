# Database Migrations

This document describes the Drizzle ORM migration workflow for the Mellon Portal application.

## Overview

Mellon Portal uses [Drizzle ORM](https://orm.drizzle.team/) for database schema management and migrations. The schema is defined in TypeScript at `src/lib/db/schema.ts`, and Drizzle Kit generates SQL migrations from schema changes.

The application uses a **schema-first approach**: you define your schema in TypeScript, then generate SQL migrations from those definitions.

## Migration Commands

The following npm scripts are available for database operations:

### `npm run db:generate`

Generates new migration files from schema changes.

```bash
npm run db:generate
```

This command:
- Reads the schema from `src/lib/db/schema.ts`
- Compares against the current migration history
- Creates a new SQL migration file in the `./drizzle` directory
- Does NOT apply the migration to the database

Use this command after making any changes to `schema.ts`.

### `npm run db:migrate`

Applies pending migrations to the database.

```bash
npm run db:migrate
```

This command:
- Reads all migration files from `./drizzle`
- Applies any unapplied migrations in order
- Updates the migration tracking table in the database

Use this command to bring your database up to date with all migrations.

### `npm run db:push`

Pushes schema changes directly to the database without creating migration files.

```bash
npm run db:push
```

This command:
- Reads the schema from `src/lib/db/schema.ts`
- Applies changes directly to the database
- Does NOT create migration files

**Warning:** Only use this in development for rapid prototyping. Never use in production as it bypasses the migration history.

### `npm run db:studio`

Opens Drizzle Studio for database inspection.

```bash
npm run db:studio
```

This command:
- Starts a local web interface for browsing your database
- Useful for debugging and data inspection
- Opens in your browser at http://localhost:4983

## Development Workflow

### Making Schema Changes

1. **Edit the schema file**

   Make your changes in `src/lib/db/schema.ts`. For example, adding a new column:

   ```typescript
   export const users = pgTable('users', {
     // existing columns...
     newColumn: varchar('new_column', { length: 255 }),
   });
   ```

2. **Generate a migration**

   ```bash
   npm run db:generate
   ```

   This creates a new SQL file in `./drizzle` with a timestamp and descriptive name.

3. **Review the generated migration**

   Always review the generated SQL before applying:

   ```bash
   cat drizzle/XXXX_migration_name.sql
   ```

   Ensure the SQL matches your intended changes.

4. **Apply the migration locally**

   ```bash
   npm run db:migrate
   ```

5. **Verify the changes**

   Use Drizzle Studio to inspect the database:

   ```bash
   npm run db:studio
   ```

6. **Commit the migration**

   Always commit both the schema changes and the generated migration file:

   ```bash
   git add src/lib/db/schema.ts drizzle/
   git commit -m "Add new_column to users table"
   ```

### Adding Indexes

Indexes are defined in the table's third argument:

```typescript
import { pgTable, uuid, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull(),
}, (table) => [
  index('users_email_idx').on(table.email),
]);
```

After adding indexes, generate and apply a new migration.

## Production Deployment

### Pre-Deployment Checklist

1. **Backup the database**

   Always create a backup before running migrations in production.

2. **Test migrations locally**

   Run migrations against a local copy of production data if possible.

3. **Review migration SQL**

   Carefully review all SQL statements in the migration file.

4. **Plan for rollback**

   Have a rollback plan ready. Note that Drizzle does not automatically generate down migrations.

### Running Migrations in Production

1. Set the `DATABASE_URL` environment variable to your production database.

2. Run the migration command:

   ```bash
   npm run db:migrate
   ```

3. Verify the migration succeeded by checking application functionality.

### Zero-Downtime Considerations

For zero-downtime deployments:

- **Add columns as nullable first**, then backfill data, then add NOT NULL constraint in a separate migration
- **Create indexes concurrently** when possible for large tables (manual SQL may be required)
- **Deploy application code before migrations** if the code handles missing columns gracefully
- **Deploy migrations before application code** if new code requires the new columns

### Rollback Considerations

Drizzle Kit does not automatically generate rollback (down) migrations. If you need to rollback:

1. **Manual SQL**: Write and execute manual SQL to reverse the migration
2. **Restore from backup**: Restore the database from a pre-migration backup
3. **Forward-fix**: Create a new migration that reverts the changes

For critical production environments, consider:
- Maintaining manual rollback scripts for each migration
- Using database snapshots before applying migrations
- Testing rollback procedures in staging environments

## Troubleshooting

### Common Issues

#### "Cannot find module" errors

Ensure all dependencies are installed:

```bash
npm install
```

#### DATABASE_URL not set

The `DATABASE_URL` environment variable must be set. Create a `.env` file:

```
DATABASE_URL=postgresql://user:password@localhost:5432/mellon_portal
```

#### Schema drift

If the database schema differs from the expected migration state:

1. Run `npm run db:push` in development to sync the schema
2. Or manually apply the missing changes

**Warning:** Never use `db:push` in production.

#### Migration conflicts

If multiple developers create migrations simultaneously:

1. Pull the latest changes from the repository
2. Regenerate your migration:
   ```bash
   rm drizzle/XXXX_your_migration.sql
   npm run db:generate
   ```

#### "relation already exists" errors

This typically means:
- The migration was partially applied
- The database was modified outside of migrations

Solutions:
1. Mark the migration as applied manually in the migration tracking table
2. Or restore from backup and reapply migrations

### Getting Help

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
