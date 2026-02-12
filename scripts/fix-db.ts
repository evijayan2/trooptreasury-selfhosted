import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.prod' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const connectionString = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL || process.env.PROD_POSTGRES_PRISMA_URL
console.log("Fixing DB:", connectionString?.replace(/:([^:@]+)@/, ':****@'))

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    try {
        // 1. Delete Pending Registrations (to unblock slugs)
        const deletedPending = await prisma.pendingRegistration.deleteMany({})
        console.log(`Deleted ${deletedPending.count} pending registrations.`)

        // 2. Delete System Admin (to unblock /setup)
        const deletedUsers = await prisma.user.deleteMany({
            where: { email: 'system@trooptreasury.com' }
        })
        console.log(`Deleted ${deletedUsers.count} system users.`)

        console.log("Database cleared for a fresh registration/setup.")

    } catch (e) {
        console.error("Error fixing DB:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
