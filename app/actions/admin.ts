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

    // Real MRR Calculation
    let mrr = 0

    const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true"
    if (isHosted) {
        try {
            const { getStripe } = require("@/lib/stripe");
            const stripe = getStripe();

            // Group active/trialing subscriptions by planId
            const subscriptionGroups = await prisma.subscription.groupBy({
                by: ['planId'],
                where: {
                    status: { in: ['active', 'trialing'] }
                },
                _count: {
                    _all: true
                }
            })

            // Calculate total MRR based on current plan prices
            for (const group of subscriptionGroups) {
                if (!group.planId) continue

                try {
                    const price = await stripe.prices.retrieve(group.planId)
                    if (price.unit_amount) {
                        // Stripe amount is in cents
                        const amount = price.unit_amount / 100
                        const count = group._count._all

                        // Adjust for interval (if yearly, divide by 12 for monthly MRR)
                        if (price.recurring?.interval === 'year') {
                            mrr += (amount / 12) * count
                        } else {
                            mrr += amount * count
                        }
                    }
                } catch (e) {
                    console.error(`Failed to fetch price for plan ${group.planId}:`, e)
                }
            }
        } catch (e) {
            console.log("Stripe interaction skipped in self-hosted mode");
        }
    }

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
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const troop = await prisma.troop.findUnique({
        where: { id: troopId },
        include: { subscription: true }
    })

    if (!troop?.subscription?.stripeSubscriptionId) throw new Error("No active subscription")

    const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true"
    if (!isHosted) {
        console.log("Stripe is disabled in self-hosted mode")
        return
    }

    const { getStripe } = require("@/lib/stripe");
    const stripe = getStripe()
    const subId = troop.subscription.stripeSubscriptionId

    try {
        if (action === 'cancel') {
            await stripe.subscriptions.cancel(subId)
            // Webhook will handle DB update, but we can optimistically update or wait
        } else if (action === 'pause') {
            await stripe.subscriptions.update(subId, {
                pause_collection: { behavior: 'void' } // Indefinite pause
            })
        } else if (action === 'resume') {
            await stripe.subscriptions.update(subId, {
                pause_collection: null
            })
        }

        await prisma.adminAuditLog.create({
            data: {
                adminId: session.user.id,
                action: `SUBSCRIPTION_${action.toUpperCase()}`,
                targetId: troopId
            }
        })

    } catch (e: any) {
        throw new Error(`Stripe Action Failed: ${e.message}`)
    }

    revalidatePath("/admin")
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

    // Enrich troops with MRR data
    const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true"
    if (!isHosted) {
        return { troops: troops.map(t => ({ ...t, mrr: 0 })), total, pages: Math.ceil(total / limit) }
    }

    const { getStripe } = require("@/lib/stripe");
    const stripe = getStripe()

    // 1. Collect unique plan IDs
    const planIds = Array.from(new Set(troops.map(t => t.subscription?.planId).filter(Boolean))) as string[]

    // 2. Fetch prices in parallel
    const priceMap = new Map<string, number>()
    await Promise.all(planIds.map(async (planId) => {
        try {
            const price = await stripe.prices.retrieve(planId)
            if (price.unit_amount) {
                // Calculate monthly equivalent
                let amount = price.unit_amount / 100
                if (price.recurring?.interval === 'year') amount /= 12
                priceMap.set(planId, amount)
            }
        } catch (e) {
            console.error(`Failed to fetch price for ${planId}`, e)
        }
    }))

    // 3. Attach MRR to troops
    const troopsWithMrr = troops.map(troop => {
        const planId = troop.subscription?.planId
        const mrr = (planId && (troop.subscription?.status === 'active' || troop.subscription?.status === 'trialing'))
            ? priceMap.get(planId) || 0
            : 0
        return { ...troop, mrr }
    })

    return { troops: troopsWithMrr, total, pages: Math.ceil(total / limit) }
}

export async function getTransactions({
    limit = 20,
    startingAfter
}: {
    limit?: number,
    startingAfter?: string
}) {
    const session = await auth()
    if ((session?.user as any)?.role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) {
        return { data: [] as any[], hasMore: false, lastId: undefined }
    }

    // Fetch charges from Stripe
    const charges = await stripe.charges.list({
        limit,
        starting_after: startingAfter,
        expand: ['data.customer']
    })

    return {
        data: charges.data,
        hasMore: charges.has_more,
        lastId: charges.data.length > 0 ? charges.data[charges.data.length - 1].id : undefined
    }
}

export async function getWebhooks({
    page = 1,
    limit = 20,
    status
}: {
    page?: number,
    limit?: number,
    status?: string
}) {
    const session = await auth()
    if ((session?.user as any)?.role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const where: any = {}
    if (status) {
        if (status === 'failed') where.error = { not: null }
        if (status === 'success') where.error = null
    }

    const [events, total] = await Promise.all([
        prisma.webhookEvent.findMany({
            where,
            take: limit,
            skip: (page - 1) * limit,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.webhookEvent.count({ where })
    ])

    // Try to enrich with Troop Name
    const eventsWithTroop = await Promise.all(events.map(async (ev) => {
        let troopName = null
        try {
            const payload = ev.payload as any
            // Common paths for customer ID
            const customerId = payload.customer || payload.data?.object?.customer
            if (customerId && typeof customerId === 'string') {
                const troop = await prisma.troop.findFirst({
                    where: { subscription: { stripeCustomerId: customerId } },
                    select: { name: true, slug: true }
                })
                if (troop) troopName = troop.name
            }
        } catch (e) {
            // Ignore parsing errors
        }
        return { ...ev, troopName }
    }))

    return { events: eventsWithTroop, total, pages: Math.ceil(total / limit) }
}

export async function issueRefund(chargeId: string, amountCents?: number, reason?: string) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) {
        throw new Error("Stripe is disabled in self-hosted mode")
    }

    try {
        const refund = await stripe.refunds.create({
            charge: chargeId,
            amount: amountCents, // Optional: full refund if null
            reason: reason as any || 'requested_by_customer'
        })

        await prisma.adminAuditLog.create({
            data: {
                adminId: session.user.id,
                action: 'ISSUE_REFUND',
                targetId: chargeId,
                details: {
                    refundId: refund.id,
                    amount: amountCents ? amountCents / 100 : 'full',
                    reason
                }
            }
        })

        revalidatePath("/admin/transactions")
        return { success: true, refundId: refund.id }

    } catch (e: any) {
        throw new Error(`Refund Failed: ${e.message}`)
    }
}

// Coupon & Promotion Code Management
export async function getCoupons() {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) return [] as any[]

    const coupons = await stripe.coupons.list({ limit: 100 })
    return JSON.parse(JSON.stringify(coupons.data))
}

export async function createCoupon(data: {
    name: string,
    percent_off?: number,
    amount_off?: number,
    duration: 'once' | 'repeating' | 'forever',
    duration_in_months?: number
}) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) throw new Error("Stripe is disabled in self-hosted mode")

    const coupon = await stripe.coupons.create({
        name: data.name,
        percent_off: data.percent_off,
        amount_off: data.amount_off ? data.amount_off * 100 : undefined, // to cents
        currency: data.amount_off ? 'usd' : undefined,
        duration: data.duration,
        duration_in_months: data.duration === 'repeating' ? data.duration_in_months : undefined,
    })

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'CREATE_COUPON',
            targetId: coupon.id,
            details: data
        }
    })

    revalidatePath("/admin/coupons")
    return JSON.parse(JSON.stringify(coupon))
}

export async function deleteCoupon(couponId: string) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) throw new Error("Stripe is disabled in self-hosted mode")

    await stripe.coupons.del(couponId)

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'DELETE_COUPON',
            targetId: couponId
        }
    })

    revalidatePath("/admin/coupons")
}

export async function getPromotionCodes() {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) return [] as any[]

    const promoCodes = await stripe.promotionCodes.list({
        limit: 100,
        expand: ['data.coupon']
    })
    return JSON.parse(JSON.stringify(promoCodes.data))
}

export async function createPromotionCode(data: {
    couponId: string,
    code?: string,
    max_redemptions?: number,
    expires_at?: number
}) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) throw new Error("Stripe is disabled in self-hosted mode")

    const promo = await stripe.promotionCodes.create({
        coupon: data.couponId,
        code: data.code,
        max_redemptions: data.max_redemptions,
        expires_at: data.expires_at,
    } as any)

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'CREATE_PROMO_CODE',
            targetId: promo.id,
            details: data
        }
    })

    revalidatePath("/admin/coupons")
    return JSON.parse(JSON.stringify(promo))
}

export async function deactivatePromotionCode(promoId: string) {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== "PLATFORM_ADMIN") throw new Error("Unauthorized")

    const stripe: any = process.env.NEXT_PUBLIC_IS_HOSTED === "true" ? require("@/lib/stripe").getStripe() : null

    if (!stripe) throw new Error("Stripe is disabled in self-hosted mode")

    await stripe.promotionCodes.update(promoId, { active: false })

    await prisma.adminAuditLog.create({
        data: {
            adminId: session.user.id,
            action: 'DEACTIVATE_PROMO_CODE',
            targetId: promoId
        }
    })

    revalidatePath("/admin/coupons")
}

