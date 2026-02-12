import { PrismaClient } from "@prisma/client"

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined,
    pool: Pool | undefined
}

const getConnectionString = () => {
    // Prioritize VERCEL_ENV as it distinguishes between 'production' and 'preview' deployments
    if (process.env.VERCEL_ENV === "production") {
        return (
            process.env.PROD_DATABASE_URL ||
            process.env.PROD_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    if (
        process.env.VERCEL_ENV === "preview" ||
        process.env.VERCEL_ENV === "development"
    ) {
        return (
            process.env.PREVIEW_DATABASE_URL ||
            process.env.PREVIEW_POSTGRES_PRISMA_URL ||
            process.env.DATABASE_URL
        )
    }

    // Fallback for local development or non-Vercel environments
    return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL
}

function createPrismaClient() {
    const connectionString = getConnectionString()

    // Shelter the pool to prevent leakage during hot reloads
    const pool = globalForPrisma.pool || new Pool({
        connectionString,
        max: 10, // Slightly lower max to be pooler-friendly
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000, // Wait longer for TLS
        ssl: connectionString?.includes('sslmode=require') ? {
            rejectUnauthorized: false
        } : false
    })

    if (process.env.NODE_ENV !== "production") {
        globalForPrisma.pool = pool
    }

    const adapter = new PrismaPg(pool)

    return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma
}
