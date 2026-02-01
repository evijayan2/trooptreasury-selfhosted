import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
// dotenv.config()

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@example.com'
    const password = process.env.ADMIN_PASSWORD || 'TroopTreasury2026!' // Meets new password requirements
    const hashedPassword = await bcrypt.hash(password, 10)

    // 1. Create Default Troop
    const troop = await prisma.troop.upsert({
        where: { slug: 'troop-1' },
        update: {
            name: process.env.TROOP_NAME || 'Troop 79',
        },
        create: {
            name: process.env.TROOP_NAME || 'Troop 79',
            slug: 'troop-1',
            council: 'Grand Canyon Council',
            district: 'Lost Dutchman',
        },
    })
    console.log('--- Default Troop Created: ', troop.name)

    // 2. Create Admin User
    const user = await prisma.user.upsert({
        where: { email },
        update: {
            isActive: true,
            passwordHash: hashedPassword,
        },
        create: {
            email,
            name: 'Admin User',
            role: Role.ADMIN,
            passwordHash: hashedPassword,
            isActive: true,
        },
    })

    // 3. Link User to Troop as Admin
    await prisma.troopMember.upsert({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: user.id
            }
        },
        update: {
            role: Role.ADMIN
        },
        create: {
            troopId: troop.id,
            userId: user.id,
            role: Role.ADMIN
        }
    })

    console.log({ user })
    console.log('\n=== Admin User Created & Linked ===')
    console.log('Email:', email)
    console.log('Troop:', troop.name)
    console.log('URL Slug:', troop.slug)
    console.log('===================================\n')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
