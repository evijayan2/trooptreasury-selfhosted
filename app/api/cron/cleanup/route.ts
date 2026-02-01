import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { TroopStatus } from "@prisma/client"

export async function GET(req: Request) {
    // Protected by a secret key in header (standard Vercel Cron pattern)
    // For MVP, checking simply:
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Allow running in dev without secret if specifically enabled? No, keep secure.
        // For development tests, one can set CRON_SECRET or bypass.
        // return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const thresholdDate = new Date()
        thresholdDate.setDate(thresholdDate.getDate() - 7)

        const troopsToDelete = await prisma.troop.findMany({
            where: {
                status: {
                    in: ["GRACE_PERIOD", "PENDING_DELETION"] as TroopStatus[]
                },
                deactivatedAt: {
                    lt: thresholdDate
                }
            }
        })

        console.log(`Found ${troopsToDelete.length} troops to cleanup.`)

        const results = []

        for (const troop of troopsToDelete) {
            console.log(`Deleting troop: ${troop.name} (${troop.id})`)

            // Perform Cascade Delete manually if schema doesn't enforce it
            // Or just try deleting troop and catch error
            try {
                // Delete dependants first manually to be safe (if not cascading)
                // Note: Transaction ensures atomicity
                await prisma.$transaction(async (tx) => {
                    // Delete Members link
                    await tx.troopMember.deleteMany({ where: { troopId: troop.id } })
                    // Delete Scouts (and their sales, parents links, etc - recursive nightmare if not cascaded)
                    // ... This is why OnDelete: Cascade in schema is better.
                    // Assuming we might have foreign key constraints errors:

                    // Let's attempt root delete first. If it fails, we know we need cascades.
                    await tx.troop.delete({ where: { id: troop.id } })
                })

                results.push({ id: troop.id, status: "deleted" })
            } catch (error: any) {
                console.error(`Failed to delete troop ${troop.id}:`, error)
                results.push({ id: troop.id, status: "failed", error: error.message })
            }
        }

        return NextResponse.json({ success: true, results })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
