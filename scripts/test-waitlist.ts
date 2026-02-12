import 'dotenv/config'
import { prisma } from "../lib/prisma"
import { internal_registerScoutForCampout, internal_removeScoutFromCampout, internal_promoteFromWaitlist, internal_demoteToWaitlist } from "../app/actions"

async function runTest() {
    console.log("Starting Waitlist Verification...")

    try {
        // 1. Setup Test Data
        console.log("Creating Test Data...")
        const timestamp = Date.now()
        const troopSlug = `test-troop-${timestamp}`
        const troop = await prisma.troop.create({
            data: {
                name: "Waitlist Test Troop",
                slug: troopSlug
            }
        })

        const adminUser = await prisma.user.create({
            data: {
                email: `admin-${timestamp}@test.com`,
                name: "Test Admin",
                isActive: true
            }
        })

        await prisma.troopMember.create({
            data: {
                troopId: troop.id,
                userId: adminUser.id,
                role: "LEADER"
            }
        })

        // Create Scouts with linked users (simulating self-registration or parent registration)
        const scouts = []
        for (let i = 1; i <= 3; i++) {
            const user = await prisma.user.create({
                data: {
                    email: `scout${i}-${timestamp}@test.com`,
                    name: `Scout ${i}`,
                    isActive: true
                }
            })
            const scout = await prisma.scout.create({
                data: {
                    troopId: troop.id,
                    name: `Scout ${i}`,
                    userId: user.id,
                    email: user.email
                }
            })
            // Make user a member
            await prisma.troopMember.create({
                data: { troopId: troop.id, userId: user.id, role: "SCOUT" }
            })
            scouts.push({ scout, user })
        }

        // Create Campout with Limit 2
        const campout = await prisma.campout.create({
            data: {
                troopId: troop.id,
                name: "Limited Capacity Campout",
                startDate: new Date(),
                endDate: new Date(),
                scoutLimit: 2,
                status: "OPEN"
            }
        })

        console.log(`Campout created with limit 2. ID: ${campout.id}`)

        // 2. Register Scout 1 -> Expected RESERVED
        console.log("Registering Scout 1...")
        const res1 = await internal_registerScoutForCampout(campout.id, scouts[0].scout.id, scouts[0].user.id)
        console.log("Scout 1 Result:", res1)
        if (res1.message !== "Scout registered") throw new Error("Scout 1 failed to reserve")

        // 3. Register Scout 2 -> Expected RESERVED
        console.log("Registering Scout 2...")
        // Sleep slightly to ensure createdAt differences? Prisma handles it but good to be safe
        await new Promise(r => setTimeout(r, 100))
        const res2 = await internal_registerScoutForCampout(campout.id, scouts[1].scout.id, scouts[1].user.id)
        console.log("Scout 2 Result:", res2)
        if (res2.message !== "Scout registered") throw new Error("Scout 2 failed to reserve")

        // 4. Register Scout 3 -> Expected WAITLISTED
        console.log("Registering Scout 3...")
        await new Promise(r => setTimeout(r, 100))
        const res3 = await internal_registerScoutForCampout(campout.id, scouts[2].scout.id, scouts[2].user.id)
        console.log("Scout 3 Result:", res3)
        if (res3.message !== "Scout added to waitlist") throw new Error("Scout 3 should be waitlisted")

        // Verify Status in DB
        const s3Status = await prisma.campoutScout.findUnique({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scouts[2].scout.id } }
        })
        if (s3Status?.status !== "WAITLISTED") throw new Error("DB Status is not WAITLISTED for Scout 3")
        console.log("Verified Scout 3 is WAITLISTED in DB")

        // 5. Remove Scout 1 -> Expected Scout 3 Promotion
        console.log("Removing Scout 1 (triggering promotion)...")
        // Use Admin to remove
        const removeRes = await internal_removeScoutFromCampout(campout.id, scouts[0].scout.id, adminUser.id)
        console.log("Remove Result:", removeRes)
        if (removeRes.error) throw new Error(`Failed to remove: ${removeRes.error}`)

        // 6. Verify Scout 3 is now RESERVED
        const s3StatusNew = await prisma.campoutScout.findUnique({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scouts[2].scout.id } }
        })
        if (s3StatusNew?.status !== "RESERVED") throw new Error(`Scout 3 was not promoted! Status: ${s3StatusNew?.status}`)
        console.log("Values Verified: Scout 3 promoted to RESERVED!")

        // 7. Manual Demotion Test: Demote Scout 3 -> Waitlisted
        console.log("Demoting Scout 3 to Waitlist...")
        await new Promise(r => setTimeout(r, 100))
        const demoteRes = await internal_demoteToWaitlist(campout.id, scouts[2].scout.id, 'SCOUT', adminUser.id)
        if (demoteRes.error) throw new Error(`Failed to demote: ${demoteRes.error}`)

        const s3StatusDemoted = await prisma.campoutScout.findUnique({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scouts[2].scout.id } }
        })
        if (s3StatusDemoted?.status !== "WAITLISTED") throw new Error(`Scout 3 was not demoted! Status: ${s3StatusDemoted?.status}`)
        console.log("Values Verified: Scout 3 demoted to WAITLISTED!")

        // 8. Manual Promotion Test: Promote Scout 3 -> Reserved
        console.log("Promoting Scout 3 to Reserved list...")
        await new Promise(r => setTimeout(r, 100))
        const promoteRes = await internal_promoteFromWaitlist(campout.id, scouts[2].scout.id, 'SCOUT', adminUser.id)
        if (promoteRes.error) throw new Error(`Failed to promote: ${promoteRes.error}`)

        const s3StatusPromoted = await prisma.campoutScout.findUnique({
            where: { campoutId_scoutId: { campoutId: campout.id, scoutId: scouts[2].scout.id } }
        })
        if (s3StatusPromoted?.status !== "RESERVED") throw new Error(`Scout 3 was not promoted! Status: ${s3StatusPromoted?.status}`)
        console.log("Values Verified: Scout 3 promoted (manually) to RESERVED!")

        console.log("SUCCESS: All tests passed.")

    } catch (e: any) {
        console.error("Test Failed:", e)
    } finally {
        console.log("Cleaning up...")
        // Basic cleanup logic - delete troop should cascade mostly, but we can just leave it or wipe specific IDs
        // Since we used unique slug, it won't conflict.
        // But for hygiene:
        // await prisma.troop.delete({ where: { slug: ... } })
        await prisma.$disconnect()
    }
}

runTest();
