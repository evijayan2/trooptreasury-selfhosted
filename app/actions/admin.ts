'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { revalidatePath } from "next/cache"

export async function factoryResetData() {
    const session = await auth()

    if (session?.user?.role !== Role.ADMIN) {
        throw new Error("Unauthorized: Only Admins can perform a factory reset.")
    }

    console.log('⚠️  Starting Factory Reset (preserving Admins & TroopSettings)...')

    // 1. FundraisingOrder
    await prisma.fundraisingOrder.deleteMany()

    // 2. FundraisingSale
    await prisma.fundraisingSale.deleteMany()

    // 3. AdultExpense
    await prisma.adultExpense.deleteMany()

    // 4. CampoutAdult
    await prisma.campoutAdult.deleteMany()

    // 5. CampoutScout
    await prisma.campoutScout.deleteMany()

    // 6. ParentScout
    await prisma.parentScout.deleteMany()

    // 7. Transaction
    await prisma.transaction.deleteMany()

    // 8. Campout
    await prisma.campout.deleteMany()

    // 9. FundraisingCampaign
    await prisma.fundraisingCampaign.deleteMany()

    // 10. BudgetCategory
    await prisma.budgetCategory.deleteMany()

    // 11. Budget
    await prisma.budget.deleteMany()

    // 12. Scout
    await prisma.scout.deleteMany()

    // 13. User (except ADMIN) - SKIPPED due to global user model
    // const { count } = await prisma.user.deleteMany({
    //     where: {
    //         role: {
    //             not: Role.ADMIN
    //         }
    //     }
    // })
    // console.log(`✅ Deleted ${count} non-admin Users`)
    console.log(`ℹ️ Skipped User deletion (Global Users)`)

    console.log('\n🎉 Factory Reset Complete!')

    revalidatePath("/")
    revalidatePath("/dashboard")
}

export async function getAdminDashboardStats() {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Use global check since we have role in session now
    if ((session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")



    const [totalTroops, activeSubs, trialingSubs, canceledSubs] = await Promise.all([
        prisma.troop.count(),
        prisma.subscription.count({ where: { status: "active" } }),
        prisma.subscription.count({ where: { status: "trialing" } }),
        prisma.subscription.count({ where: { status: "canceled" } })
    ])

    
    let mrr = 0
    // Stripe disabled in self-hosted
    const recentSignups = await prisma.troop.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
            subscription: true,
            members: {
                where: { role: "ADMIN" },
                include: { user: true },
                take: 1
            }
        }
    })

    return {
        totalTroops,
        activeSubs,
        trialingSubs,
        canceledSubs,
        mrr,
        recentSignups
    }
}

export async function lockTroop(troopId: string, reason: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // Auth check
    if ((session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    await prisma.troop.update({
        where: { id: troopId },
        data: {
            status: 'PAUSED',
            deactivatedAt: new Date()
        }
    })

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'LOCK_ACCOUNT',
            targetId: troopId,
            details: { reason }
        }
    })

    revalidatePath("/admin")
}

export async function unlockTroop(troopId: string) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    await prisma.troop.update({
        where: { id: troopId },
        data: {
            status: 'ACTIVE',
            deactivatedAt: null
        }
    })

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'UNLOCK_ACCOUNT',
            targetId: troopId
        }
    })

    revalidatePath("/admin")
}

export async function manageSubscription(troopId: string, action: 'cancel' | 'pause' | 'resume') {
    throw new Error("Subscription management is disabled in self-hosted mode.")
}


export async function factoryResetTroop(troopId: string, confirmation: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    if ((session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const troop = await prisma.troop.findUnique({ where: { id: troopId } })
    if (!troop || troop.slug !== confirmation) throw new Error("Confirmation failed")

    // Transactional Delete
    await prisma.$transaction(async (tx) => {
        // Delete all dependent data
        await tx.transaction.deleteMany({ where: { troopId } })
        await tx.scout.deleteMany({ where: { troopId } })
        await tx.campout.deleteMany({ where: { troopId } })
        await tx.fundraisingCampaign.deleteMany({ where: { troopId } })
        await tx.budget.deleteMany({ where: { troopId } })

        // Memberships
        await tx.troopMember.deleteMany({ where: { troopId } })

        // Subscription
        await tx.subscription.delete({ where: { troopId } })

        // Troop itself
        await tx.troop.delete({ where: { id: troopId } })
    })

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'FACTORY_RESET',
            targetId: troopId,
            details: { slug: troop.slug }
        }
    })

    revalidatePath("/admin")
}

export async function getTroops({
    search,
    status,
    page = 1,
    limit = 20
}: {
    search?: string,
    status?: string,
    page?: number,
    limit?: number
}) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    if ((session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const where: any = {}

    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { slug: { contains: search, mode: 'insensitive' } },
            // Search by admin email logic requires nested filtering which is expensive but ok for admin
            // We'll skip complex relation filtering for MVP speed or implement if needed.
            // Simplified:
        ]
    }

    if (status && status !== 'ALL') {
        // Check if status is subscription status or troop status
        const subStatuses = ['active', 'trialing', 'past_due', 'canceled', 'unpaid']
        if (subStatuses.includes(status.toLowerCase())) {
            where.subscription = { status: status.toLowerCase() }
        } else if (['ACTIVE', 'PAUSED', 'GRACE_PERIOD', 'PENDING_DELETION'].includes(status)) {
            where.status = status
        }
    }

    const [troops, total] = await Promise.all([
        prisma.troop.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { createdAt: 'desc' },
            include: {
                subscription: true,
                members: {
                    where: { role: 'ADMIN' },
                    take: 1,
                    include: { user: true }
                }
            }
        }),
        prisma.troop.count({ where })
    ])

    
    // Stripe disabled
    const troopsWithMrr = troops.map(t => ({ ...t, mrr: 0 }))
    return { troops: troopsWithMrr, total, pages: Math.ceil(total / limit) }
}

export async function getTransactions({
    limit = 20,
    startingAfter
}: {
    limit?: number,
    startingAfter?: string
}) {
    return {
        data: [],
        hasMore: false,
        lastId: undefined
    }
}

export async function getWebhooks() {
            return { events: [], total: 0, pages: 0 };
        }

export async function issueRefund(chargeId: string, amountCents?: number, reason?: string) {
    throw new Error("Refunds are disabled in self-hosted mode.")
}

// Coupon & Promotion Code Management
export async function getCoupons() { throw new Error("Not supported in self-hosted"); }

export async function createCoupon() { throw new Error("Not supported in self-hosted"); }

export async function deleteCoupon() { throw new Error("Not supported in self-hosted"); }

export async function getPromotionCodes() { throw new Error("Not supported in self-hosted"); }

export async function createPromotionCode() { throw new Error("Not supported in self-hosted"); }

export async function deactivatePromotionCode() { throw new Error("Not supported in self-hosted"); }

