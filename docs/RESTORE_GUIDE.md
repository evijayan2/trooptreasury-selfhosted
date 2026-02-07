# Database Restore Guide

## Quick Restore: From Backup to Production/Preview

This guide shows you how to download backups from GitHub Actions and restore them to your Neon databases.

---

## 📥 Step 1: Download Backup from GitHub Actions

### Navigate to Actions
1. Go to your repository: `https://github.com/evijayan2/trooptreasury/actions`
2. Click on "Database Backup & Deploy" workflow
3. Find a successful run (green checkmark ✅)
4. Click on the workflow run

### Download Artifact
1. Scroll to bottom of the page
2. Find "Artifacts" section
3. Click on `database-backup-[commit-sha]` to download
4. Unzip the downloaded file to get the `.sql` backup file

**Backup file format:** `backup_YYYYMMDD_HHMMSS.sql`

---

## 🔄 Step 2: Restore to Neon Database

### Important: Use Non-Pooled Connection String

For restore operations, you MUST use the **direct (non-pooled)** connection string:

❌ **Don't use:** `ep-xxx-pooler.c-3.us-east-1.aws.neon.tech` (pooled)  
✅ **Use:** `ep-xxx.c-3.us-east-1.aws.neon.tech` (direct)

Find this in Neon Console → Connection Details → Direct connection

---

## Option 1: Restore to Preview Database (Safest)

**Recommended for testing or recovering from errors**

### Using Local Script

```bash
# 1. Set environment variables
$env:DATABASE_URL = "postgresql://user:pass@ep-xxx.c-3.us-east-1.aws.neon.tech:5432/dbname"
$env:CONFIRM_RESTORE = "yes"

# 2. Run restore
node scripts/restore-database.js path/to/backup_20260206_153000.sql
```

### Using pg_restore Directly

```bash
# Set password
$env:PGPASSWORD = "your-password"

# Restore
pg_restore -h ep-xxx.c-3.us-east-1.aws.neon.tech `
  -p 5432 `
  -U your-username `
  -d your-preview-database `
  --clean `
  --no-owner `
  --no-acl `
  backup_20260206_153000.sql
```

---

## Option 2: Restore to Production Database

⚠️ **CAUTION:** This will overwrite your production data!

### Best Practice: Use Neon Branching

**Step 1: Create Safety Branch**
1. Go to Neon Console
2. Navigate to your project
3. Click "Branches" → "New Branch"
4. Create branch from current production (e.g., `restore-test`)

**Step 2: Restore to Branch**
```bash
# Use the branch's connection string
$env:DATABASE_URL = "postgresql://user:pass@ep-xxx.c-3.us-east-1.aws.neon.tech:5432/dbname?options=endpoint%3Dep-branch-xxx"
$env:CONFIRM_RESTORE = "yes"

node scripts/restore-database.js path/to/backup.sql
```

**Step 3: Verify Data**
- Connect to the branch
- Check that data looks correct
- Test critical functionality

**Step 4: Promote to Production**
- In Neon Console, set the branch as primary
- OR restore directly to production (see below)

### Direct Production Restore (High Risk)

**Only do this if:**
- You've verified the backup is good
- You have another backup as failsafe
- Downtime is acceptable

```bash
# 1. Create a final backup first!
npm run db:backup

# 2. Set production database URL (non-pooled)
$env:DATABASE_URL = "postgresql://user:pass@ep-xxx.c-3.us-east-1.aws.neon.tech:5432/production-db"
$env:CONFIRM_RESTORE = "yes"

# 3. Restore
node scripts/restore-database.js path/to/backup.sql
```

---

## 🎯 Common Scenarios

### Scenario 1: Preview Deploy Broke Something

**Goal:** Restore preview database to last known good state

1. Download backup from before the breaking change
2. Restore to preview database:
   ```bash
   $env:DATABASE_URL = "your-preview-database-url"
   $env:CONFIRM_RESTORE = "yes"
   node scripts/restore-database.js backup.sql
   ```
3. Redeploy preview environment in Vercel

### Scenario 2: Production Data Corruption

**Goal:** Safely restore production data

1. Download most recent good backup
2. Create Neon branch: `emergency-restore`
3. Restore to branch (test it!)
4. If good, restore to production
5. If bad, try earlier backup

### Scenario 3: Testing Migration Rollback

**Goal:** Test what happens if you need to rollback

1. Create Neon branch: `migration-test`
2. Restore backup from before migration
3. Test application functionality
4. Document any issues
5. Delete test branch when done

---

## 📋 Backup Identification

**Find the right backup:**

Backups are named by timestamp: `backup_YYYYMMDD_HHMMSS.sql`
- `20260206_153000` = February 6, 2026 at 3:30 PM

**Which backup to use:**
- Latest backup: Most recent data
- Before migration: If migration caused issues
- Before deployment: If deployment broke something
- Specific date/time: For targeted recovery

---

## ⚠️ Important Notes

### Connection String Requirements

**For Restore Operations:**
- ✅ Use **direct** connection (non-pooled)
- ✅ Remove `?sslmode=require` if present
- ✅ Check connection limit (Neon has max connections)

### Database Compatibility

- Backups are PostgreSQL format (`.sql`)
- Compatible with Neon, Supabase, any PostgreSQL 17
- Server and client versions should match (we use PG 17)

### Permissions

Your database user must have:
- `CREATE` permission (to recreate tables)
- `DROP` permission (for `--clean` flag)
- Ownership of objects (or use `--no-owner --no-acl`)

---

## 🆘 Troubleshooting

### "Permission denied to drop database"

This is normal with Neon. Use Neon Console to reset database instead of `--clean` flag.

### "Connection limit exceeded"

Neon has connection limits. If restore fails:
1. Close all other connections
2. Use direct (non-pooled) connection
3. Wait a few minutes and retry

### "Restore seems stuck"

Large databases take time. Monitor with:
```bash
# Add verbose flag
pg_restore --verbose -h ... 
```

### "Version mismatch error"

Ensure pg_restore version matches server:
```bash
# Install PostgreSQL 17 client
# See DEPLOYMENT.md for instructions
```

---

## 📚 Related Documentation

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Backup procedures
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Automated backup setup
- [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md) - Data protection features

---

## Quick Reference

**Download backup:**
```
GitHub → Actions → Database Backup & Deploy → Artifacts
```

**Restore to preview:**
```bash
$env:CONFIRM_RESTORE = "yes"
node scripts/restore-database.js backup.sql
```

**Restore to production (safe):**
```bash
# 1. Create Neon branch first
# 2. Restore to branch
# 3. Test
# 4. Promote branch
```

**Emergency contact:**
- Backups retained: 30 days
- Location: GitHub Actions Artifacts
- Format: PostgreSQL dump (`.sql`)
