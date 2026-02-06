# Mellon Franchising Database Guide

## Overview

The Mellon Franchising portal runs on the `mellon-franchising` VM (192.168.1.66) with a PostgreSQL 17 database managed via Coolify.

| Field | Value |
|-------|-------|
| VM | mellon-franchising (192.168.1.66) |
| DB Container | `ds88g0w4s48k0888sksow4sw` |
| DB Image | `postgres:17-alpine` |
| App Container | `lk44k8w4sc00gk0s8c440ww8` |
| User | `mellon` |
| Database | `mellon_portal` |
| Port | 5432 |

## SSH to the VM

```bash
# Ensure your key is loaded
ssh-add ~/.ssh/id_ed25519_old

# Connect to mellon-franchising VM via bastion
ssh -o ProxyCommand="ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519_old -W %h:%p root@38.32.12.11" \
    -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519_old \
    build3r@192.168.1.66
```

## Find the Containers

```bash
sudo docker ps --format 'table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}'
```

## Open a psql Shell

```bash
sudo docker exec -it ds88g0w4s48k0888sksow4sw psql -U mellon -d mellon_portal
```

## Running Migrations

`drizzle-kit` is not installed in the production image (it's a devDependency), so migrations must be run directly via `psql`.

### Single Statement

```bash
sudo docker exec ds88g0w4s48k0888sksow4sw \
  psql -U mellon -d mellon_portal \
  -c "ALTER TABLE my_table ADD COLUMN my_col text;"
```

### From a Migration File

Copy the file into the container first, then execute it:

```bash
sudo docker cp drizzle/0005_some_migration.sql ds88g0w4s48k0888sksow4sw:/tmp/migration.sql
sudo docker exec ds88g0w4s48k0888sksow4sw \
  psql -U mellon -d mellon_portal -f /tmp/migration.sql
```

### Drizzle Migration Files

Migration SQL files live in the app container at `/app/drizzle/`. To check which files exist:

```bash
sudo docker exec lk44k8w4sc00gk0s8c440ww8 ls drizzle/
```

To view a migration before running it:

```bash
sudo docker exec lk44k8w4sc00gk0s8c440ww8 cat drizzle/0004_add-dollar-value-access-token-and-indexes.sql
```

Note: Strip the `--> statement-breakpoint` comments — they are Drizzle metadata and not valid SQL.

## Notes

- Coolify's built-in terminal for this database container may not work. Use SSH + `docker exec` as described above.
- Migrations run manually via `psql` are **not** tracked in Drizzle's `__drizzle_migrations` journal. If the app attempts to re-apply them on startup, they will fail harmlessly (e.g., "column already exists").
- Always verify the migration was applied by checking table structure: `\d table_name` in psql.
