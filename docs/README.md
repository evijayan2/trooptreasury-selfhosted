# TroopTreasury Documentation

## 📚 Documentation Index

### Database & Migrations

- **[MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md)** - Comprehensive guide on safe database migrations and data protection
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration workflows and backup procedures
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Automated deployment setup with GitHub Actions
- **[RESTORE_GUIDE.md](./RESTORE_GUIDE.md)** - How to download backups and restore to production/preview databases

### Application Guides

- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user guide for using TroopTreasury
- **[VERCEL_SETUP.md](./VERCEL_SETUP.md)** - Vercel deployment setup instructions
- **[README_SELFHOSTED.md](./README_SELFHOSTED.md)** - Self-hosted deployment guide
- **[CALCULATIONS.md](./CALCULATIONS.md)** - Financial calculations and logic documentation

## 🚀 Quick Start

### For Developers

1. **Setting Up Deployments:** [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Database Changes:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
3. **Understanding Safety:** [MIGRATION_SAFETY.md](./MIGRATION_SAFETY.md)

### For Administrators

1. **User Guide:** [USER_GUIDE.md](./USER_GUIDE.md)
2. **Financial Logic:** [CALCULATIONS.md](./CALCULATIONS.md)

### For DevOps

1. **Vercel Setup:** [VERCEL_SETUP.md](./VERCEL_SETUP.md)
2. **Self-Hosted:** [README_SELFHOSTED.md](./README_SELFHOSTED.md)

## 🔒 Key Principle

**All database operations are designed to NEVER lose data.** The migration system uses `prisma migrate deploy` which only applies new changes and never resets existing data.
