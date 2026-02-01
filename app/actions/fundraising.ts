"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Decimal } from "decimal.js"
import { FundraisingType, TransactionType } from "@prisma/client"
import { z } from "zod"

import { getTroopContext } from "./tenant-context"
import { notifyTroopScouts } from "./notifications"

const createCampaignSchema = z.object({
    name: z.string().min(1, "Name is required"),
    goal: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Goal must be positive"),
    type: z.nativeEnum(FundraisingType),
    startDate: z.string(),
    endDate: z.string().optional(),

    // Simple %
    ibaPercentage: z.string().optional(),

    // Products (JSON string)
    products: z.string().optional(),

    // Shotgun / Event
    description: z.string().optional(),
    ticketPrice: z.string().optional(),
    volunteerPercentage: z.string().optional(),
})

export async function createFundraisingCampaign(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const rawData = {
            name: formData.get("name"),
            goal: formData.get("goal"),
            type: formData.get("type"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate") || undefined,
            ibaPercentage: formData.get("ibaPercentage") || undefined,
            products: formData.get("products") || undefined,
            description: formData.get("description") || undefined,
            ticketPrice: formData.get("ticketPrice") || undefined,
            volunteerPercentage: formData.get("volunteerPercentage") || undefined,
        }

        const validated = createCampaignSchema.safeParse(rawData)

        if (!validated.success) {
            return { error: "Invalid fields", issues: validated.error.flatten() }
        }

        const data = validated.data
        const products = data.products ? JSON.parse(data.products) : []

        await prisma.fundraisingCampaign.create({
            data: {
                troopId: troop.id, // Scoped to Troop
                name: data.name,
                goal: new Decimal(data.goal),
                type: data.type,
                startDate: new Date(data.startDate),
                endDate: data.endDate ? new Date(data.endDate) : null,

                // Fields mapped based on type
                ibaPercentage: data.ibaPercentage ? parseInt(data.ibaPercentage) : 0,

                products: {
                    create: products.map((p: any) => ({
                        name: p.name,
                        price: new Decimal(p.price),
                        cost: new Decimal(p.cost),
                        ibaAmount: new Decimal(p.ibaAmount || 0),
                    }))
                },

                description: data.description || null,
                ticketPrice: data.ticketPrice ? new Decimal(data.ticketPrice) : null,
                volunteerPercentage: data.volunteerPercentage ? new Decimal(data.volunteerPercentage) : new Decimal(0),
            }
        })

        revalidatePath(`/dashboard/fundraising`)
        return { success: true, message: "Campaign created successfully" }
    } catch (error: any) {
        console.error("Create Campaign Error:", error)
        return { error: error.message || "Failed to create campaign" }
    }
}

export async function toggleVolunteer(campaignId: string, scoutId: string, isVolunteering: boolean, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        // Verify Campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        if (isVolunteering) {
            await prisma.fundraisingVolunteer.create({
                data: { campaignId, scoutId }
            })
        } else {
            await prisma.fundraisingVolunteer.delete({
                where: {
                    campaignId_scoutId: { campaignId, scoutId }
                }
            })
        }
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Volunteer Toggle Error:", error)
        return { error: "Failed to update volunteer status" }
    }
}

const transactionSchema = z.object({
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be positive"),
    description: z.string().min(1, "Description is required"),
    date: z.string(),
    type: z.enum(["INCOME", "EXPENSE"]),
})

export async function addCampaignTransaction(campaignId: string, prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop, user } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const validated = transactionSchema.safeParse({
            amount: formData.get("amount"),
            description: formData.get("description"),
            date: formData.get("date"),
            type: formData.get("type"),
        })

        if (!validated.success) {
            return { error: "Invalid fields" }
        }

        const { amount, description, date, type } = validated.data

        // Verify Campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        await prisma.transaction.create({
            data: {
                troopId: troop.id, // Scoped
                fundraisingCampaignId: campaignId,
                amount: new Decimal(amount),
                description: description,
                createdAt: new Date(date),
                type: type === "INCOME" ? TransactionType.DONATION_IN : TransactionType.EXPENSE,
                status: "APPROVED",
                approvedBy: user.id,
                userId: user.id,
                fromAccount: 'MANUAL'
            }
        })
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Transaction added" }
    } catch (error: any) {
        return { error: "Failed to save transaction" }
    }
}

// Logic for calculating shares without committing
export async function calculateDistribution(campaignId: string) {
    const campaign = await prisma.fundraisingCampaign.findUnique({
        where: { id: campaignId },
        include: {
            transactions: true,
            sales: { include: { scout: true } },
            volunteers: { include: { scout: true } }
        }
    })

    if (!campaign) throw new Error("Campaign not found")

    // 1. Calculate Net Profit
    // Total Revenue = Product Sales + Donations
    // Product Sales = Sum of (Order Quantity * Product Price)
    // Donations = Transactions marked as Income

    const donations = (campaign.transactions as any[])
        .filter(t => [TransactionType.DONATION_IN, TransactionType.FUNDRAISING_INCOME].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

    const expenses = (campaign.transactions as any[])
        .filter(t => [TransactionType.EXPENSE, TransactionType.IBA_DEPOSIT].includes(t.type))
        .reduce((sum, t) => sum.plus(t.amount), new Decimal(0))

    // For multi-product, we should use the orders
    const orders = await prisma.fundraisingOrder.findMany({
        where: { campaignId },
        include: { product: true, scout: true }
    })

    const totalProductRevenue = orders.reduce((sum, order) => {
        const price = (order as any).product?.price || (campaign as any).ticketPrice || new Decimal(0)
        return sum.plus(new Decimal(price).times(order.quantity))
    }, new Decimal(0))

    const totalRevenue = totalProductRevenue.plus(donations)
    const netProfit = totalRevenue.minus(expenses)

    if (netProfit.lte(0)) {
        return {
            netProfit: netProfit.toNumber(),
            ibaTotal: 0,
            volunteerTotal: 0,
            sellerTotal: 0,
            shares: []
        }
    }

    // 2. Splits
    const volunteerCount = (campaign as any).volunteers?.length || 0
    // IBA % (e.g., 30%)
    const ibaTotal = netProfit.times(new Decimal(campaign.ibaPercentage).div(100))

    // Volunteer % (e.g., 5% of Net Profit)
    const volunteerTotal = netProfit.times(((campaign as any).volunteerPercentage || new Decimal(0)).div(100))

    // Seller Pool = IBA Total - Volunteer Total
    let sellerTotal = ibaTotal.minus(volunteerTotal)
    if (sellerTotal.isNegative()) sellerTotal = new Decimal(0)

    // 3. Distribution
    const shares: Record<string, Decimal> = {}

    // Seller Share - based on product IBA amounts OR global percentage
    // If a product has a specific ibaAmount, we use that. Otherwise we use the campaign % split.

    // Recalculate seller pool based on products if applicable
    let totalSellerShareFromProducts = new Decimal(0)
    let hasProductSpecificIBA = false

    orders.forEach(order => {
        if (order.product && order.product.ibaAmount.gt(0)) {
            totalSellerShareFromProducts = totalSellerShareFromProducts.plus(order.product.ibaAmount.times(order.quantity))
            hasProductSpecificIBA = true
        }
    })

    // If we have product specific IBA, that's our base for seller shares.
    // Otherwise we use the calculated sellerTotal pool divided by total units (tickets).

    if (hasProductSpecificIBA) {
        // Distribute based on exact product IBA
        orders.forEach(order => {
            const share = (order.product?.ibaAmount || new Decimal(0)).times(order.quantity)
            if (share.gt(0)) {
                shares[order.scoutId] = (shares[order.scoutId] || new Decimal(0)).plus(share)
            }
        })

        // Add volunteer shares on top
        if (volunteerCount > 0) {
            const perVolunteer = volunteerTotal.div(volunteerCount)
                ; (campaign as any).volunteers.forEach((v: any) => {
                    shares[v.scoutId] = (shares[v.scoutId] || new Decimal(0)).plus(perVolunteer)
                })
        }
    } else {
        // Fallback to pool-based distribution (like original)
        // Volunteer Share
        if (volunteerCount > 0) {
            const perVolunteer = volunteerTotal.div(volunteerCount)
                ; (campaign as any).volunteers.forEach((v: any) => {
                    shares[v.scoutId] = (shares[v.scoutId] || new Decimal(0)).plus(perVolunteer)
                })
        }

        // Seller Share
        const totalUnitsSold = orders.reduce((sum, o) => sum + o.quantity, 0)
        if (totalUnitsSold > 0) {
            const perUnit = sellerTotal.div(totalUnitsSold)
            orders.forEach(o => {
                const scoutShare = perUnit.times(o.quantity)
                shares[o.scoutId] = (shares[o.scoutId] || new Decimal(0)).plus(scoutShare)
            })
        }
    }

    // Format for UI
    const result = Object.entries(shares).map(([scoutId, amount]) => {
        const scout = orders.find(o => o.scoutId === scoutId)?.scout
            || (campaign as any).volunteers?.find((v: any) => v.scoutId === scoutId)?.scout
        return {
            scoutId,
            scoutName: (scout as any)?.name || "Unknown",
            amount: amount.toNumber() // Return number for UI formatting
        }
    })

    return {
        netProfit: netProfit.toNumber(),
        ibaTotal: ibaTotal.toNumber(),
        volunteerTotal: volunteerTotal.toNumber(),
        sellerTotal: sellerTotal.toNumber(),
        shares: result
    }
}

export async function commitDistribution(campaignId: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop, user } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        // Verify Campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        const { shares } = await calculateDistribution(campaignId)

        if (shares.length === 0) {
            return { error: "No shares to distribute" }
        }

        await prisma.$transaction(async (tx) => {
            // 1. Create Transactions for each scout
            for (const share of shares) {
                if (share.amount <= 0.01) continue

                await tx.transaction.create({
                    data: {
                        troopId: troop.id, // Scoped
                        fundraisingCampaignId: campaignId,
                        scoutId: share.scoutId,
                        amount: new Decimal(share.amount),
                        type: TransactionType.IBA_DEPOSIT,
                        description: `Distribution from Campaign`,
                        status: "APPROVED",
                        approvedBy: user.id,
                        userId: user.id,
                        fromAccount: 'MANUAL'
                    }
                })

                // Update Scout Balance
                await tx.scout.update({
                    where: { id: share.scoutId },
                    data: { ibaBalance: { increment: share.amount } }
                })
            }

            // 2. Mark Campaign as Closed/Distributed?
            await tx.fundraisingCampaign.update({
                where: { id: campaignId },
                data: { status: "CLOSED" }
            })
        })

        revalidatePath(`/dashboard/fundraising`)
        return { success: true, message: "Funds distributed and campaign closed." }
    } catch (error: any) {
        console.error("Distribution Error:", error)
        return { error: "Failed to commit distribution" }
    }
}

const updateSettingsSchema = z.object({
    sendThankYou: z.boolean(),
    thankYouTemplate: z.string().optional(),
    sendEventInvite: z.boolean(),
    // Financials
    ibaPercentage: z.string().optional(),
    volunteerPercentage: z.string().optional(),
    ticketPrice: z.string().optional(),
    goal: z.string().optional(),
})

export async function updateCampaignSettings(campaignId: string, prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        // Verify Campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        const rawData = {
            sendThankYou: formData.get("sendThankYou") === "on",
            thankYouTemplate: formData.get("thankYouTemplate"),
            sendEventInvite: formData.get("sendEventInvite") === "on",
            ibaPercentage: formData.get("ibaPercentage"),
            volunteerPercentage: formData.get("volunteerPercentage"),
            ticketPrice: formData.get("ticketPrice"),
            goal: formData.get("goal"),
        }

        await prisma.fundraisingCampaign.update({
            where: { id: campaignId },
            data: {
                sendThankYou: rawData.sendThankYou,
                thankYouTemplate: rawData.thankYouTemplate as string,
                sendEventInvite: rawData.sendEventInvite,
                // Financials
                ibaPercentage: rawData.ibaPercentage ? parseInt(rawData.ibaPercentage as string) : undefined,
                volunteerPercentage: rawData.volunteerPercentage ? new Decimal(rawData.volunteerPercentage as string) : undefined,
                ticketPrice: rawData.ticketPrice ? new Decimal(rawData.ticketPrice as string) : undefined,
                goal: rawData.goal ? new Decimal(rawData.goal as string) : undefined,
            }
        })

        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Settings updated" }
    } catch (error: any) {
        console.error("Update Settings Error:", error)
        return { error: "Failed to update settings" }
    }
}

export async function publishCampaign(campaignId: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        // Verify
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        await prisma.fundraisingCampaign.update({
            where: { id: campaignId },
            data: { status: 'ACTIVE' }
        })

        // Notify Scouts
        await notifyTroopScouts(
            troop.id,
            "New Fundraising Campaign!",
            `The campaign "${campaign.name}" is now active. Check it out!`,
            `/dashboard/my-fundraising/${campaignId}`
        )

        revalidatePath(`/dashboard/fundraising`)
        revalidatePath(`/dashboard/my-fundraising`)
        revalidatePath(`/dashboard/finance/fundraising`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true }
    } catch (error: any) {
        return { error: "Failed to publish campaign" }
    }
}

export async function closeCampaign(campaignId: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop, user } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        // Verify
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        // Calculate distribution
        const { shares } = await calculateDistribution(campaignId)

        await prisma.$transaction(async (tx) => {
            // 1. Distribute if there are shares
            if (shares.length > 0) {
                for (const share of shares) {
                    if (share.amount <= 0.01) continue

                    await tx.transaction.create({
                        data: {
                            troopId: troop.id, // Scoped
                            fundraisingCampaignId: campaignId,
                            scoutId: share.scoutId,
                            amount: new Decimal(share.amount),
                            type: TransactionType.IBA_DEPOSIT,
                            description: `Distribution from Campaign`,
                            status: "APPROVED",
                            approvedBy: user.id,
                            userId: user.id,
                            fromAccount: 'MANUAL'
                        }
                    })

                    // Update Scout Balance
                    await tx.scout.update({
                        where: { id: share.scoutId },
                        data: { ibaBalance: { increment: share.amount } }
                    })
                }
            }

            // 2. Close Campaign
            await tx.fundraisingCampaign.update({
                where: { id: campaignId },
                data: { status: 'CLOSED' }
            })
        })

        revalidatePath(`/dashboard/fundraising`)
        revalidatePath(`/dashboard/my-fundraising`)
        revalidatePath(`/dashboard/finance/fundraising`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: shares.length > 0 ? "Campaign Closed and Funds Distributed" : "Campaign Closed" }
    } catch (error: any) {
        console.error("Close Campaign Error:", error)
        return { error: "Failed to close campaign" }
    }
}

export async function deleteCampaign(campaignId: string, slug: string) {
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        const campaign = await prisma.fundraisingCampaign.findUnique({
            where: { id: campaignId },
            include: { _count: { select: { transactions: true, orders: true } } }
        })

        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        // Guard: Prevent deletion if Not DRAFT
        if (campaign.status !== 'DRAFT') {
            return { error: "Cannot delete a campaign that is not in DRAFT state. Close it instead." }
        }

        const hasActivity = campaign._count.transactions > 0 || campaign._count.orders > 0
        if (hasActivity) {
            return { error: "Cannot delete a campaign that has financial activity." }
        }

        // Manual cleanup just in case (e.g. settings, volunteers if any)
        await prisma.fundraisingSale.deleteMany({ where: { campaignId } })
        await prisma.fundraisingVolunteer.deleteMany({ where: { campaignId } })
        await prisma.fundraisingOrder.deleteMany({ where: { campaignId } }) // Should be 0 if we passed guard, but for Draft it might be tested?

        await prisma.fundraisingCampaign.delete({ where: { id: campaignId } })

        revalidatePath(`/dashboard/fundraising`)
        return { success: true }
    } catch (error: any) {
        console.error("Delete Error", error)
        return { error: "Failed to delete campaign" }
    }
}

export async function deleteOrder(campaignId: string, orderId: string, slug: string) {
    if (!slug) return { error: "Missing context" }
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER"])

        // Verify Order
        const order = await prisma.fundraisingOrder.findUnique({ where: { id: orderId } })
        // We could also verify order->campaign->troopId but we must fetch campaign
        const campaign = await prisma.fundraisingCampaign.findUnique({ where: { id: campaignId } })
        if (!campaign || campaign.troopId !== troop.id) return { error: "Campaign not found" }

        await prisma.fundraisingOrder.delete({
            where: { id: orderId }
        })

        revalidatePath(`/dashboard/my-fundraising/${campaignId}`)
        revalidatePath(`/dashboard/fundraising/campaigns/${campaignId}`)
        revalidatePath(`/dashboard/finance/fundraising/${campaignId}`)
        return { success: true, message: "Order deleted" }
    } catch (error: any) {
        console.error("Delete Order Error", error)
        return { error: "Failed to delete order" }
    }
}
