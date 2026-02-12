# Production Database Reset Operations

This document outlines the procedure for performing a hard reset of the production database.

> [!CAUTION]
> This is a destructive operation. All data will be lost. Ensure a backup is created first.

## 1. Pre-reset Backup
Run a full database dump of the production database to the `backups/` directory.

```bash
npx dotenv-cli -e .env.prod -- node scripts/backup-database.js
```

## 2. Hard Reset (Schema Drop)
Drop the `public` schema to ensure a completely clean state.

```bash
npx dotenv-cli -e .env.prod -- npx tsx scripts/hard-reset-db.ts
```

## 3. Schema Rebuild
Use Prisma to push the current schema to the database. This ensures all tables and indexes are recreated according to `prisma/schema.prisma`.

```bash
npx dotenv-cli -e .env.prod -- npx prisma db push
```

## 4. Database Seeding
Run the seed script to create the initial System Administrator account and any other default data.

```bash
npx dotenv-cli -e .env.prod -- npx prisma db seed
```

## 5. Verification
Verify the database state after the reset.

```bash
npx dotenv-cli -e .env.prod -- npx tsx scripts/check-db.ts
```
