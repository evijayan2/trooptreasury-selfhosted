# Automated Deployment & Backup Setup

## 🚀 Overview

Your application now has **automatic database backups** before every deployment to Vercel. No manual steps required!

## 📋 How It Works

### 1. GitHub Actions Workflow

**File:** `.github/workflows/backup-and-deploy.yml`

**When it runs:**
- Every push to `main` branch
- Manual trigger via GitHub Actions UI

**What it does:**
1. ✅ Creates database backup (PostgreSQL dump)
2. ✅ Uploads backup to GitHub Artifacts (30-day retention)
3. ✅ Runs `prisma migrate deploy` (safe production migrations)
4. ✅ Vercel deploys automatically after success

**Benefits:**
- Automatic backups before every deployment
- No data loss from migrations
- Backup history in GitHub
- Can download backups anytime

### 2. Vercel Build Process

**File:** `scripts/vercel-build.sh`

**What it does:**
- Uses `prisma migrate deploy` instead of `migrate dev`
- **NEVER resets the database**
- Only applies new migrations
- Safe for production

**File:** `vercel.json`

Configures Vercel to use the custom build script.

## 🔧 Setup Instructions

### Step 1: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **DATABASE_URL**
   - Your production database connection string
   - Example: `postgresql://user:pass@host:5432/dbname`

2. **NEXTAUTH_SECRET** (if not already added)
3. **NEXTAUTH_URL** (if not already added)

### Step 2: Configure Vercel Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables

Add the same variables:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Step 3: Make Build Script Executable

```bash
git add .github/workflows/backup-and-deploy.yml
git add scripts/vercel-build.sh
git add vercel.json
chmod +x scripts/vercel-build.sh
git commit -m "Add automated backup and deployment workflow"
git push origin main
```

### Step 4: Verify Workflow

1. Go to GitHub → Actions tab
2. You should see "Database Backup & Deploy" workflow running
3. Check that backup was created successfully
4. Vercel will deploy after GitHub Actions completes

## 📦 Accessing Backups

### Download from GitHub

1. Go to GitHub → Actions → Select a workflow run
2. Scroll to "Artifacts" section
3. Download `database-backup-<commit-sha>`

### Restore a Backup

```bash
# Download the backup from GitHub Artifacts
# Then restore locally:
$env:CONFIRM_RESTORE="yes"
npm run db:restore path/to/backup.sql
```

## 🔒 Production Migration Flow

### How Migrations Work Now:

**Development (Local):**
```bash
npm run db:migrate  # Backs up, then runs prisma migrate dev
```

**Production (Vercel):**
1. Push to `main` branch
2. GitHub Actions:
   - ✅ Creates backup automatically
   - ✅ Runs `prisma migrate deploy`
3. Vercel builds and deploys
4. **No data loss!**

### Key Difference:

- `prisma migrate dev`: Creates new migrations, can reset database
- `prisma migrate deploy`: Only applies pending migrations, **never resets**

## 🎯 Best Practices

### ✅ DO:

1. Always make schema changes in `schema.prisma`
2. Test migrations locally first
3. Review migration SQL files before pushing
4. Push to `main` only when ready to deploy
5. Check GitHub Actions logs to verify backup

### ❌ DON'T:

1. Modify production database directly
2. Use `prisma migrate reset` on production (it's blocked anyway)
3. Skip testing migrations locally
4. Push directly to production without reviewing

## 🚨 Emergency: Restore Production Database

If something goes wrong in production:

1. **Stop deployments** (pause Vercel auto-deploy)
2. **Download latest backup** from GitHub Actions artifacts
3. **Restore to production:**
   - Use your database provider's restore tools
   - Or run restore script with production DATABASE_URL

4. **Fix the issue** in code
5. **Re-deploy** with fix

## 📊 Backup Retention

- **GitHub Artifacts**: 30 days
- For longer retention, configure cloud storage:
  - Uncomment "Upload to cloud storage" step in workflow
  - Add AWS S3, Google Cloud Storage, or Azure credentials

## ⚙️ Optional: Cloud Storage Backups

To keep backups longer than 30 days:

1. **Add cloud provider secrets** (e.g., AWS_S3_BUCKET)
2. **Uncomment cloud upload step** in `.github/workflows/backup-and-deploy.yml`
3. **Install cloud CLI** in the workflow

Example for S3:
```yaml
- name: Upload to S3
  run: |
    aws s3 cp backup_*.sql s3://${{ secrets.AWS_S3_BUCKET }}/backups/
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## 🎉 Summary

✅ Automatic backups before every deployment  
✅ Safe production migrations (no resets)  
✅ 30-day backup retention on GitHub  
✅ One-command restore  
✅ No manual intervention needed  

Just push to `main` and let the automation handle the rest!
