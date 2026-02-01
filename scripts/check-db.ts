import { PrismaClient } from "@prisma/client"
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    console.log('--- DB Check ---')
    const troop = await prisma.troop.findFirst({ where: { slug: 'troop-1' } })
    console.log('Troop:', JSON.stringify(troop, null, 2))

    if (troop) {
        const members = await prisma.troopMember.findMany({
            where: { troopId: troop.id },
            include: { user: { select: { email: true, name: true } } }
        })
        console.log('Members:', JSON.stringify(members, null, 2))
    }

    const scoutsCount = await prisma.scout.count({ where: { troopId: troop?.id } })
    console.log('Scouts Count:', scoutsCount)

    if (troop && scoutsCount === 0) {
        console.log('Seeding mock scouts...')
        await prisma.scout.createMany({
            data: [
                { name: 'Scout One', troopId: troop.id, ibaBalance: 10.50, status: 'ACTIVE' },
                { name: 'Scout Two', troopId: troop.id, ibaBalance: -5.00, status: 'ACTIVE' },
            ]
        })
        console.log('Mock scouts seeded.')
    }
}

main().catch(console.error).finally(() => prisma.$disconnect())
