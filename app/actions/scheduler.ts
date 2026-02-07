import { prisma } from "@/lib/prisma"

/**
 * Checks for expired events (Campouts, Fundraisers) and progresses their state.
 * This is intended to be called periodically (e.g. via cron) or on page load.
 */
export async function checkAndExpireEvents(troopId: string) {
    const now = new Date()
    // Reuse the global logic but scoped to a troop
    await expireCampouts(now, troopId)
    await expireFundraisers(now, troopId)
}

/**
 * Runs the expiry check for ALL troops.
 */
export async function runGlobalEventExpiry() {
    console.log('[Scheduler] Running global event expiry check...')
    const now = new Date()
    await expireCampouts(now)
    await expireFundraisers(now)
}

async function expireCampouts(now: Date, troopId?: string) {
    try {
        const whereClause: any = {
            status: "OPEN",
            endDate: { lt: now }
        }
        if (troopId) whereClause.troopId = troopId

        const result = await prisma.campout.updateMany({
            where: whereClause,
            data: { status: "READY_FOR_PAYMENT" }
        })
        if (result.count > 0) {
            console.log(`[Scheduler] Expired ${result.count} campouts.`)
        }
    } catch (error) {
        console.error("Failed to auto-expire campouts", error)
    }
}

async function expireFundraisers(now: Date, troopId?: string) {
    try {
        const whereClause: any = {
            status: "ACTIVE",
            endDate: { lt: now }
        }
        if (troopId) whereClause.troopId = troopId

        const result = await prisma.fundraisingCampaign.updateMany({
            where: whereClause,
            data: { status: "CLOSED" }
        })
        if (result.count > 0) {
            console.log(`[Scheduler] Expired ${result.count} fundraisers.`)
        }
    } catch (error) {
        console.error("Failed to auto-expire fundraisers", error)
    }
}
