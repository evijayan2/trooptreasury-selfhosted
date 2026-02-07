import { PrismaClient } from '@prisma/client'
import 'dotenv/config'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
    const users = await prisma.user.findMany({
        include: {
            scout: true,
            troopMemberships: true
        }
    })

    console.log("Users and their Scout links:")
    for (const user of users) {
        console.log(`User: ${user.name} (${user.email}), Role: ${user.role}, ID: ${user.id}`)
        if (user.scout) {
            console.log(`  -> Linked Scout: ${user.scout.name} (ID: ${user.scout.id})`)

            // Check campout participation for this scout
            const participations = await prisma.campoutScout.findMany({
                where: { scoutId: user.scout.id },
                include: { campout: true }
            })

            if (participations.length > 0) {
                console.log(`     Participating in Campouts:`)
                participations.forEach(p => console.log(`       - ${p.campout.name} (Status: ${p.campout.status})`))
            } else {
                console.log(`     Not participating in any campouts.`)
            }

        } else {
            console.log(`  -> No Scout link`)
        }
    }

    console.log("\nAll Campout Participations (CampoutScout):")
    const allParticipations = await prisma.campoutScout.findMany({
        include: { campout: true, scout: true }
    })
    if (allParticipations.length === 0) {
        console.log("  No scouts are registered for any campout.")
    } else {
        allParticipations.forEach(p => {
            console.log(`  - Campout: ${p.campout.name}, Scout: ${p.scout.name}`)
        })
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
