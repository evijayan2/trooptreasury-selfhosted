#!/bin/bash

# Vercel Build Script
# This script runs during Vercel deployment
# It handles database migrations safely without resetting

echo "🚀 Starting Vercel build process..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations in production mode (safe - no reset)
if [ "$VERCEL_ENV" = "production" ]; then
  echo "🔄 Running production database migrations..."
  npx prisma migrate deploy
elif [ "$VERCEL_ENV" = "preview" ]; then
  echo "🔄 Running preview database migrations..."
  npx prisma migrate deploy
else
  echo "🔄 Running development database migrations..."
  # For development, we can use migrate dev
  npx prisma migrate dev --name auto_migration || npx prisma migrate deploy
fi

# Run seed if needed (optional)
if [ "$VERCEL_ENV" = "production" ] && [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Running database seed..."
  npx prisma db seed
fi

# Build Next.js application
echo "🏗️  Building Next.js application..."
next build

echo "✅ Build complete!"
