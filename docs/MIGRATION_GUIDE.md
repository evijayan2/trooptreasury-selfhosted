# Database Migration Guide

## ⚠️ IMPORTANT: Always Backup Before Major Migrations

To prevent data loss, **ALWAYS** create a backup before running migrations.

## Quick Backup Workflow

### 1. Create a Backup

```bash
node scripts/backup-database.js
```

This creates a timestamped backup in the `backups/` folder.

### 2. Run Your Migration

```bash
npx prisma migrate dev --name your_migration_name
```

### 3. If Something Goes Wrong - Restore

```bash
# Set confirmation variable and restore
$env:CONFIRM_RESTORE="yes"
node scripts/restore-database.js backups/trooptreasury_2026-02-06T15-00-00.sql
```

---

## Common Migration Scenarios

### Scenario 1: Adding New Models (Safe)

When adding new models like we did with DirectSales:

```bash
# 1. Backup first
node scripts/backup-database.js

# 2. Run migration
npx prisma migrate dev --name add_new_models

# No data loss - new tables are created
```

### Scenario 2: Schema Drift Detected

If you see "schema drift detected" error:

**Option A: Fix Drift Without Data Loss (Recommended)**

```bash
# 1. BACKUP FIRST!
node scripts/backup-database.js

# 2. Create a migration to match current state
npx prisma migrate dev --name fix_schema_drift

# 3. Prisma will detect differences and create migration
```

**Option B: Reset Database (LOSES DATA)**

```bash
# Only use for development when data loss is acceptable
# 1. Backup anyway (just in case)
node scripts/backup-database.js

# 2. Reset
npx prisma migrate reset
```

### Scenario 3: Modifying Existing Models

**CRITICAL: These changes can cause data loss!**

Examples:
- Renaming columns
- Changing column types
- Removing columns

```bash
# 1. MUST BACKUP!
node scripts/backup-database.js

# 2. Make schema changes in schema.prisma

# 3. Create migration
npx prisma migrate dev --name modify_schema

# 4. Review the migration file BEFORE applying!
# Check: prisma/migrations/[timestamp]_modify_schema/migration.sql

# 5. If migration looks wrong, cancel and fix schema
```

---

## What Caused the Schema Drift?

The schema drift you encountered happened because:

1. A database change was made directly (e.g., `ALTER TYPE` SQL command)
2. This change wasn't tracked in Prisma migrations
3. Database state ≠ Migration history

**How to Prevent:**
- ✅ **ALWAYS** make schema changes in `schema.prisma`, not directly in database
- ✅ **ALWAYS** use `prisma migrate dev` to apply changes
- ✅ **NEVER** run raw SQL to modify schema (use data migrations for data changes)

---

## NPM Scripts (Add to package.json)

You can add these shortcuts to your `package.json`:

```json
{
  "scripts": {
    "db:backup": "node scripts/backup-database.js",
    "db:restore": "node scripts/restore-database.js",
    "db:migrate": "npm run db:backup && npx prisma migrate dev"
  }
}
```

Then you can use:

```bash
npm run db:backup          # Create backup
npm run db:migrate         # Backup + migrate (safe!)
npm run db:restore backups/file.sql  # Restore backup
```

---

## Backup Best Practices

1. **Before major migrations:** Always backup
2. **Before production deploys:** Backup production database
3. **Keep backups:** Don't delete old backups immediately
4. **Test restore:** Occasionally test restoring from backup to ensure it works
5. **Automate:** Use the npm scripts to make backups automatic

---

## Emergency Recovery

If you accidentally lost data:

1. **Stop everything** - don't make more changes
2. **Check backups folder** for recent backups
3. **Restore from most recent backup:**
   ```bash
   $env:CONFIRM_RESTORE="yes"
   node scripts/restore-database.js backups/[latest-backup].sql
   ```
4. **Verify data is restored**
5. **Re-apply migrations if needed**

---

## Production Migrations

**NEVER use `prisma migrate dev` in production!**

For production:

```bash
# On production server
npx prisma migrate deploy
```

This only applies pending migrations without resetting the database.
