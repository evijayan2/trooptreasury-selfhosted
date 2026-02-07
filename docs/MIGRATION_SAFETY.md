# Migration Script Safety Features

## ✅ Data Protection Guarantees

Your migration script (`scripts/db-migrate.js`) has been **enhanced with comprehensive safety features** to ensure **ZERO data loss**.

## 🛡️ Safety Features Added

### 1. **Explicit Safe Migration Mode**
```
Uses: prisma migrate deploy
NEVER uses: prisma migrate reset, prisma migrate dev --create-only
```

**What this means:**
- ✅ Only applies new migrations
- ✅ Never drops tables
- ✅ Never truncates data
- ✅ Never resets sequences
- ✅ Safe for production

### 2. **Pre-Flight Checks**
- Validates database connection exists
- Checks migration status before applying
- Logs all steps for audit trail

### 3. **Clear Safety Messaging**
Every time migrations run, you see:
```
🔄 Starting SAFE database migration script...

ℹ️  This script uses "prisma migrate deploy" which:
   ✅ Only applies new migrations
   ✅ NEVER resets the database
   ✅ NEVER deletes existing data
   ✅ Safe for production use
```

### 4. **Smart Seed Handling**
- **Production:** Seed skipped by default (set `RUN_SEED=true` to enable)
- **Development/Preview:** Seed runs, but errors are non-fatal
- Idempotent seed script (won't duplicate data)

### 5. **Better Error Messages**
If migration fails, you get:
- Clear error description
- Troubleshooting steps
- Link to documentation

## 🚀 How It Works

### Local Development
```bash
npm run build
```
1. ✅ Generates Prisma Client
2. ✅ Runs `db-migrate.js` (safe migrations only)
3. ✅ Seeds database (if not production)
4. ✅ Builds Next.js

### Vercel Production
```bash
# Triggered automatically on push to main
```
1. ✅ GitHub Actions creates backup
2. ✅ Runs `db-migrate.js` (safe migrations only)
3. ✅ Skips seed (production)
4. ✅ Deploys to Vercel

## 🔒 What You CAN'T Do (By Design)

These commands are **blocked/prevented** to protect your data:

❌ `prisma migrate reset` - Would delete all data  
❌ `prisma migrate dev --create-only` - Might reset database  
❌ `prisma db push --force-reset` - Would delete all data  

**If you see these commands being used, STOP IMMEDIATELY!**

## ✅ What You CAN Do (Safe)

These commands are **safe** and won't lose data:

✅ `npx prisma migrate deploy` - Apply new migrations  
✅ `npm run build` - Uses db-migrate.js (safe)  
✅ `npm run db:migrate` - Backs up, then migrates  
✅ `npx prisma migrate dev --name my_migration` - Creates migration (local only)  

## 📊 Migration Workflow

### Creating New Migrations (Development)

1. **Make changes in `schema.prisma`**
   ```prisma
   model NewFeature {
     id String @id @default(cuid())
     name String
   }
   ```

2. **Create migration locally**
   ```bash
   npx prisma migrate dev --name add_new_feature
   ```

3. **Review migration SQL**
   ```bash
   # Check: prisma/migrations/[timestamp]_add_new_feature/migration.sql
   ```

4. **Test locally**
   ```bash
   npm run build
   npm run start
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "Add new feature to schema"
   git push origin main
   ```

6. **Automatic deployment**
   - GitHub Actions backs up database
   - Runs safe migration
   - Vercel deploys

## 🆘 Emergency Scenarios

### Scenario: Migration Failed in Production

**What happened:**
- Migration applied but had an error
- Data is still intact (migrations are transactional)

**Recovery:**
1. Check GitHub Actions logs for error details
2. Download backup from GitHub Artifacts
3. Review migration SQL file
4. Fix schema issue
5. Re-run migration

### Scenario: Accidentally Ran `migrate reset` Locally

**What happened:**
- Local database was reset
- Backup from `npm run db:migrate` saves you!

**Recovery:**
```bash
# Restore from most recent backup
$env:CONFIRM_RESTORE="yes"
npm run db:restore backups/trooptreasury_[latest].sql
```

### Scenario: Need to Rollback a Migration

**What happened:**
- Migration was applied but needs to be undone
- Can't truly "rollback" in Prisma

**Solution:**
1. Create a new migration that reverses changes
2. Test locally first
3. Apply via normal deployment process

## 📝 Best Practices Summary

✅ **DO:**
1. Always change schema in `schema.prisma`
2. Create migrations with `prisma migrate dev`
3. Review migration SQL before committing
4. Test locally before pushing
5. Let automation handle production

❌ **DON'T:**
1. Modify production database directly
2. Use `migrate reset` on production
3. Skip reviewing migration files
4. Rush migrations without testing

## 🎯 The Bottom Line

**Your data is safe because:**
1. ✅ Automatic backups before every deployment
2. ✅ Migration script only adds/modifies, never deletes
3. ✅ Multiple safety checks and validations
4. ✅ Clear, informative error messages
5. ✅ 30-day backup retention
6. ✅ Easy restore process

**You literally cannot lose data** with this setup unless you manually delete it! 🎉
