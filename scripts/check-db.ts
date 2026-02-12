import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.prod' })
dotenv.config({ path: '.env.local' })
dotenv.config()

const connectionString = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL || process.env.PROD_POSTGRES_PRISMA_URL
console.log("Checking DB:", connectionString?.replace(/:([^:@]+)@/, ':****@'))
console.log("NEXT_PUBLIC_IS_HOSTED:", process.env.NEXT_PUBLIC_IS_HOSTED)
console.log("STRIPE_SECRET_KEY set:", !!process.env.STRIPE_SECRET_KEY)

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    try {
        const users = await prisma.user.findMany()
        console.log("Users in DB:", JSON.stringify(users.map(u => ({ ...u, passwordHash: u.passwordHash ? '[SET]' : '[MISSING]' })), null, 2))

        const bcrypt = require('bcryptjs')
        for (const user of users) {
            if (user.passwordHash) {
                const match = await bcrypt.compare('TroopTreasury2026!', user.passwordHash)
                console.log(`Password match for ${user.email}:`, match)
            }
        }

        const troops = await prisma.troop.findMany()
        console.log("Troops in DB:", JSON.stringify(troops, null, 2))

        const memberships = await prisma.troopMember.findMany()
        console.log("Memberships in DB:", JSON.stringify(memberships, null, 2))

        const pending = await prisma.pendingRegistration.findMany()
        console.log("Pending Registrations in DB:", JSON.stringify(pending, null, 2))

        const webhooks = await prisma.webhookEvent.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        })
        console.log("Latest Webhook Events:", JSON.stringify(webhooks, null, 2))

    } catch (e) {
        console.error("Error checking DB:", e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
