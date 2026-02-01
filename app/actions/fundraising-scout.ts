"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { checkTroopPermission } from "@/lib/auth-helpers"
import { revalidatePath } from "next/cache"

// Original updateScoutSales likely obsolete for Events now, but keeping for backward compat or manual override?
// We will focus on recordTicketSale

export async function updateScoutSales(campaignId: string, scoutId: string, quantity: number) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get scout and troopId
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true, userId: true }
    })
    if (!scout) return { error: "Scout not found" }

    // Check if user is admin in this troop
    const isAdmin = await checkTroopPermission(session.user.id, scout.troopId, ["ADMIN"])

    // Check if user is the scout themselves
    const isScoutUser = scout.userId === session.user.id

    // Check if user is linked parent
    const isParent = !!(await prisma.parentScout.findUnique({
        where: { parentId_scoutId: { parentId: session.user.id, scoutId } }
    }))

    const canEdit = isAdmin || isScoutUser || isParent
    if (!canEdit) return { error: "Unauthorized access to this scout" }

    try {
        await prisma.fundraisingSale.upsert({
            where: { campaignId_scoutId: { campaignId, scoutId } },
            update: { quantity },
            create: { campaignId, scoutId, quantity }
        })

        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true }
    } catch (error) {
        console.error("Update Sales Error:", error)
        return { error: "Failed to update sales" }
    }
}

export async function recordTicketSale(campaignId: string, scoutId: string, data: { productId?: string, quantity: number, customerName: string, customerEmail?: string }) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get scout and troopId
    const scout = await prisma.scout.findUnique({
        where: { id: scoutId },
        select: { troopId: true, userId: true }
    })
    if (!scout) return { error: "Scout not found" }

    // Check if user is admin in this troop
    const isAdmin = await checkTroopPermission(session.user.id, scout.troopId, ["ADMIN"])

    // Check if user is the scout themselves
    const isScoutUser = scout.userId === session.user.id

    // Check if user is linked parent
    const isParent = !!(await prisma.parentScout.findUnique({
        where: { parentId_scoutId: { parentId: session.user.id, scoutId } }
    }))

    const canEdit = isAdmin || isScoutUser || isParent
    if (!canEdit) return { error: "Unauthorized access to this scout" }

    try {
        // 1. Create Order
        await prisma.fundraisingOrder.create({
            data: {
                campaignId,
                scoutId,
                productId: data.productId,
                quantity: data.quantity,
                customerName: data.customerName,
                customerEmail: data.customerEmail,
                amountPaid: 0,
                delivered: true
            }
        })

        // 2. Update Total Quantity in FundraisingSale (Aggregate)
        // This keeps the distributed calculation simple (it reads FundraisingSale)
        // OR we switch calculation to read Orders. 
        // Syncing is safer for performance if many orders.

        // Let's recalc the sum
        const totalOrders = await prisma.fundraisingOrder.aggregate({
            where: { campaignId, scoutId },
            _sum: { quantity: true }
        })

        await prisma.fundraisingSale.upsert({
            where: { campaignId_scoutId: { campaignId, scoutId } },
            update: { quantity: totalOrders._sum.quantity || 0 },
            create: { campaignId, scoutId, quantity: totalOrders._sum.quantity || 0 }
        })

        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Ticket sale recorded" }
    } catch (error) {
        console.error("Record Ticket Error:", error)
        return { error: "Failed to record ticket sale" }
    }
}
