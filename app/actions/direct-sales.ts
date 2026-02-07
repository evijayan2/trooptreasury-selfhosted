"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { Decimal } from "decimal.js"
import { getTroopContext } from "./tenant-context"
import { z } from "zod"
import { createNotification } from "./notifications"

const inventorySchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Quantity must be positive"),
})

export async function createDirectSalesInventory(campaignId: string, prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const validated = inventorySchema.safeParse({
            productId: formData.get("productId"),
            quantity: formData.get("quantity"),
        })

        if (!validated.success) {
            return { error: validated.error.issues[0].message }
        }

        const { productId, quantity } = validated.data

        // Verify campaign belongs to troop
        const campaign = await prisma.fundraisingCampaign.findUnique({
            where: { id: campaignId }
        })

        if (!campaign || campaign.troopId !== troop.id) {
            return { error: "Campaign not found" }
        }

        // Verify product belongs to campaign
        const product = await prisma.campaignProduct.findUnique({
            where: { id: productId }
        })

        if (!product || product.campaignId !== campaignId) {
            return { error: "Product not found" }
        }

        const inventory = await prisma.directSalesInventory.create({
            data: {
                campaignId,
                productId,
                quantity: Number(quantity),
            }
        })

        revalidatePath(`/dashboard/fundraising/${campaignId}`)
        return { success: true, inventoryId: inventory.id }
    } catch (error: any) {
        console.error("Error creating direct sales inventory:", error)
        return { error: "Failed to create inventory" }
    }
}

const groupSchema = z.object({
    name: z.string().min(1, "Group name is required"),
    items: z.string().transform((str) => {
        try {
            return JSON.parse(str)
        } catch {
            return []
        }
    }), // Expecting JSON array of { inventoryId, quantity }
    scoutIds: z.string().optional(),
    adultIds: z.string().optional(),
})

export async function createVolunteerGroup(campaignId: string, prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const validated = groupSchema.safeParse({
            name: formData.get("name"),
            items: formData.get("items"),
            scoutIds: formData.get("scoutIds"),
            adultIds: formData.get("adultIds"),
        })

        if (!validated.success) {
            return { error: validated.error.issues[0].message }
        }

        const { name, items, scoutIds, adultIds } = validated.data
        const requestedItems = items as { inventoryId: string, quantity: number }[]

        if (requestedItems.length === 0) {
            return { error: "At least one product is required" }
        }

        // Validate inventory and quantities
        for (const item of requestedItems) {
            const inventory = await prisma.directSalesInventory.findUnique({
                where: { id: item.inventoryId },
                include: { campaign: true, groupItems: true } as any
            }) as any

            if (!inventory || inventory.campaignId !== campaignId) {
                return { error: "Invalid inventory item" }
            }
            if (inventory.campaign.troopId !== troop.id) {
                return { error: "Unauthorized" }
            }

            const allocated = inventory.groupItems.reduce((sum: number, g: any) => sum + g.quantity, 0)
            const available = inventory.quantity - allocated
            if (item.quantity > available) {
                return { error: `One or more items exceed available quantity` }
            }
        }

        // Parse volunteer IDs
        const scoutIdList = scoutIds ? scoutIds.split(",").filter(id => id.trim()) : []
        const adultIdList = adultIds ? adultIds.split(",").filter(id => id.trim()) : []

        if (scoutIdList.length === 0 && adultIdList.length === 0) {
            return { error: "At least one volunteer is required" }
        }

        // Create group with items and volunteers in a transaction
        const group = await prisma.$transaction(async (tx) => {
            const newGroup = await (tx.directSalesGroup as any).create({
                data: {
                    campaignId,
                    name,
                }
            })

            // Add items
            await (tx as any).directSalesGroupItem.createMany({
                data: requestedItems.map(item => ({
                    groupId: newGroup.id,
                    inventoryId: item.inventoryId,
                    quantity: item.quantity,
                    soldCount: 0,
                    amountCollected: 0
                }))
            })

            // Add scout volunteers
            if (scoutIdList.length > 0) {
                await tx.directSalesGroupVolunteer.createMany({
                    data: scoutIdList.map(scoutId => ({
                        groupId: newGroup.id,
                        scoutId: scoutId.trim(),
                    }))
                })
            }

            // Add adult volunteers
            if (adultIdList.length > 0) {
                await tx.directSalesGroupVolunteer.createMany({
                    data: adultIdList.map(userId => ({
                        groupId: newGroup.id,
                        userId: userId.trim(),
                    }))
                })
            }

            return newGroup
        })

        // Send notifications (Simplified for brevity, can expand later if needed)

        revalidatePath(`/dashboard/fundraising/${campaignId}`)
        return { success: true, groupId: group.id }
    } catch (error: any) {
        console.error("Error creating volunteer group:", error)
        return { error: "Failed to create group" }
    }
}

const salesSchema = z.object({
    updates: z.string().transform((str) => {
        try {
            return JSON.parse(str)
        } catch {
            return []
        }
    }), // Array of { itemId, soldCount, amountCollected }
})

export async function updateGroupSales(campaignId: string, groupId: string, prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const validated = salesSchema.safeParse({
            updates: formData.get("updates"),
        })

        if (!validated.success) {
            return { error: validated.error.issues[0].message }
        }

        const updates = validated.data.updates as { itemId: string, soldCount: number, amountCollected: number }[]

        if (updates.length === 0) {
            return { success: true } // Nothing to update
        }

        // Verify group and permission (once)
        const group = await prisma.directSalesGroup.findUnique({
            where: { id: groupId },
            include: {
                campaign: true,
                items: {
                    include: { inventory: { include: { product: true } } }
                }
            } as any
        }) as any

        if (!group) return { error: "Group not found" }
        if (group.campaignId !== campaignId) return { error: "Group mismatch" }
        if (group.campaign?.troopId !== troop.id) return { error: "Unauthorized" }

        // Process updates in transaction
        await prisma.$transaction(async (tx) => {
            for (const update of updates) {
                const item = group.items.find((i: any) => i.id === update.itemId)
                if (!item) throw new Error(`Item ${update.itemId} not found in group`)

                if (update.soldCount > item.quantity) {
                    throw new Error(`Sold count for ${item.inventory.product.name} cannot exceed ${item.quantity}`)
                }

                const maxExpected = update.soldCount * Number(item.inventory.product.price)
                if (update.amountCollected > maxExpected) {
                    throw new Error(`Amount collected for ${item.inventory.product.name} exceeds max expected ($${maxExpected})`)
                }

                await (tx as any).directSalesGroupItem.update({
                    where: { id: update.itemId },
                    data: {
                        soldCount: update.soldCount,
                        amountCollected: update.amountCollected
                    }
                })
            }
        })

        revalidatePath(`/dashboard/fundraising/${campaignId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error updating group sales:", error)
        return { error: error.message || "Failed to update sales" }
    }
}

export async function calculateDirectSalesProfit(campaignId: string) {
    try {
        console.log('[DIRECT SALES DEBUG] Starting calculation for campaign:', campaignId)

        // Get all direct sales inventory for this campaign
        const inventories = await prisma.directSalesInventory.findMany({
            where: { campaignId },
            include: {
                product: true,
                groupItems: {
                    include: {
                        group: {
                            include: {
                                volunteers: {
                                    include: {
                                        scout: true,
                                        user: true,
                                    }
                                }
                            }
                        }
                    }
                }
            } as any
        }) as any[]

        console.log('[DIRECT SALES DEBUG] Found inventories:', inventories.length)

        const scoutShares: Record<string, { scoutId: string, amount: number, groupDetails: string[] }> = {}

        for (const inventory of inventories) {
            const product = inventory.product
            const profitPerUnit = new Decimal(product.ibaAmount)

            console.log('[DIRECT SALES DEBUG] Product:', product.name, 'Profit/Unit:', profitPerUnit.toString())
            console.log('[DIRECT SALES DEBUG] GroupItems in inventory:', inventory.groupItems.length)

            for (const item of inventory.groupItems) {
                const group = item.group
                console.log('[DIRECT SALES DEBUG] Group:', group.name, 'Item Sold:', item.soldCount)

                if (item.soldCount === 0) {
                    continue
                }

                // Calculate total profit for this item sales
                const itemProfit = profitPerUnit.times(item.soldCount)
                console.log('[DIRECT SALES DEBUG] Item profit:', itemProfit.toString())

                // Get only scout volunteers (not adults)
                const scoutVolunteers = group.volunteers.filter((v: any) => v.scoutId !== null)

                if (scoutVolunteers.length === 0) {
                    console.log('[DIRECT SALES DEBUG] Skipping group - no scout volunteers')
                    continue
                }

                // Split profit equally among scout volunteers
                const profitPerScout = itemProfit.div(scoutVolunteers.length)

                for (const volunteer of scoutVolunteers) {
                    if (!volunteer.scoutId) continue

                    if (!scoutShares[volunteer.scoutId]) {
                        scoutShares[volunteer.scoutId] = {
                            scoutId: volunteer.scoutId,
                            amount: 0,
                            groupDetails: []
                        }
                    }

                    scoutShares[volunteer.scoutId].amount += profitPerScout.toNumber()
                    scoutShares[volunteer.scoutId].groupDetails.push(
                        `${group.name} (${product.name}): ${item.soldCount} sold × $${profitPerUnit.toFixed(2)} ÷ ${scoutVolunteers.length} scouts = $${profitPerScout.toFixed(2)}`
                    )
                }
            }
        }

        console.log('[DIRECT SALES DEBUG] Final scout shares:', Object.keys(scoutShares).length, 'scouts')
        console.log('[DIRECT SALES DEBUG] Scout shares detail:', scoutShares)

        // Fetch scout names for the result
        const scoutIds = Object.keys(scoutShares)
        const scouts = await prisma.scout.findMany({
            where: { id: { in: scoutIds } },
            select: { id: true, name: true }
        })

        const scoutNameMap = new Map(scouts.map(s => [s.id, s.name]))

        return {
            success: true,
            shares: Object.values(scoutShares).map(share => ({
                ...share,
                scoutName: scoutNameMap.get(share.scoutId) || "Unknown",
                amount: Math.round(share.amount * 100) / 100 // Round to 2 decimals
            }))
        }
    } catch (error: any) {
        console.error("Error calculating direct sales profit:", error)
        return { error: "Failed to calculate profit" }
    }
}

export async function deleteVolunteerGroup(campaignId: string, groupId: string, slug: string) {
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        // Verify group exists and belongs to this campaign
        const group = await prisma.directSalesGroup.findUnique({
            where: { id: groupId },
            include: {
                campaign: true,
                items: true
            } as any
        }) as any

        if (!group) {
            return { error: "Group not found" }
        }

        if (group.campaignId !== campaignId) {
            return { error: "Group does not belong to this campaign" }
        }

        if (group.campaign?.troopId !== troop.id) {
            return { error: "Unauthorized" }
        }

        // Check if any items have sales
        const hasSales = group.items.some((item: any) => item.soldCount > 0)
        if (hasSales) {
            return { error: "Cannot delete group with recorded sales" }
        }

        await prisma.directSalesGroup.delete({
            where: { id: groupId }
        })

        revalidatePath(`/dashboard/fundraising/${campaignId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting group:", error)
        return { error: "Failed to delete group" }
    }
}

export async function deleteDirectSalesInventory(campaignId: string, inventoryId: string, slug: string) {
    if (!slug) return { error: "Missing context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const inventory = await prisma.directSalesInventory.findUnique({
            where: { id: inventoryId },
            include: {
                campaign: true,
                groupItems: true,
            } as any
        }) as any

        if (!inventory || inventory.campaignId !== campaignId) {
            return { error: "Inventory not found" }
        }

        if (inventory.campaign?.troopId !== troop.id) {
            return { error: "Unauthorized" }
        }

        if (inventory.groupItems?.length > 0) {
            return { error: "Cannot delete inventory with existing groups. Delete groups first." }
        }

        await prisma.directSalesInventory.delete({
            where: { id: inventoryId }
        })

        revalidatePath(`/dashboard/fundraising/${campaignId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting inventory:", error)
        return { error: "Failed to delete inventory" }
    }
}
