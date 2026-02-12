#!/bin/bash

# Vercel Build Script
# This script runs during Vercel deployment
# It handles database migrations safely without resetting

echo "🚀 Starting Vercel build process..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations and seed safely using db-migrate.js
echo "🔄 Running database migrations..."
node scripts/db-migrate.js

# Build Next.js application
echo "🏗️  Building Next.js application..."
next build

echo "✅ Build complete!"
