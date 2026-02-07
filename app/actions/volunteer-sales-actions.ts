"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

/**
 * Fetch all direct sales groups where the current user is a volunteer
 * (either as a scout or as an adult)
 */
export async function getMyDirectSalesGroups(campaignId: string, slug: string) {
    const session = await auth()
    if (!session?.user) {
        return { error: "Unauthorized" }
    }

    try {
        // Find the scout record for this user (if they are a scout)
        const scout = await prisma.scout.findFirst({
            where: {
                userId: session.user.id,
                troop: { slug }
            }
        })

        // Build the filter to find groups where user is a volunteer
        const volunteerFilter: any = {
            campaignId,
            volunteers: {
                some: {
                    OR: [
                        { userId: session.user.id }, // Adult volunteer
                        ...(scout ? [{ scoutId: scout.id }] : []) // Scout volunteer
                    ]
                }
            }
        }

        const groups = await prisma.directSalesGroup.findMany({
            where: volunteerFilter,
            include: {
                items: {
                    include: {
                        inventory: {
                            include: {
                                product: true
                            }
                        }
                    }
                },
                volunteers: {
                    include: {
                        scout: true,
                        user: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        })

        return {
            success: true,
            groups: groups.map(g => ({
                ...g,
                items: g.items.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    soldCount: item.soldCount,
                    product: item.inventory.product ? {
                        id: item.inventory.product.id,
                        name: item.inventory.product.name,
                        price: item.inventory.product.price.toNumber(),
                        cost: item.inventory.product.cost.toNumber(),
                        ibaAmount: item.inventory.product.ibaAmount.toNumber()
                    } : null
                }))
            }))
        }
    } catch (error: any) {
        console.error("Error fetching volunteer groups:", error)
        return { error: "Failed to fetch groups" }
    }
}

const volunteerSalesSchema = z.object({
    soldCount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Sold count must be non-negative"),
})

/**
 * Allow a volunteer (scout or adult) to update their group's sales count
 */
/**
 * Allow a volunteer (scout or adult) to update their group item's sales count
 */
export async function recordVolunteerSales(itemId: string, slug: string, prevState: any, formData: FormData) {
    const session = await auth()
    if (!session?.user) {
        return { error: "Unauthorized" }
    }

    try {
        const validated = volunteerSalesSchema.safeParse({
            soldCount: formData.get("soldCount"),
        })

        if (!validated.success) {
            return { error: validated.error.issues[0].message }
        }

        const { soldCount } = validated.data

        // Fetch the group item with all related data
        const groupItem = await prisma.directSalesGroupItem.findUnique({
            where: { id: itemId },
            include: {
                group: {
                    include: {
                        campaign: {
                            include: {
                                troop: true
                            }
                        },
                        volunteers: true
                    }
                }
            }
        })

        if (!groupItem) {
            return { error: "Item not found" }
        }

        const group = groupItem.group

        // Verify the troop slug matches
        if (group.campaign.troop.slug !== slug) {
            return { error: "Invalid troop context" }
        }

        // Find the scout record for this user if they are a scout
        const scout = await prisma.scout.findFirst({
            where: {
                userId: session.user.id,
                troopId: group.campaign.troopId
            }
        })

        // Check if the current user is a volunteer in this group
        const isVolunteer = group.volunteers.some(v =>
            v.userId === session.user.id || (scout && v.scoutId === scout.id)
        )

        if (!isVolunteer) {
            return { error: "You are not a member of this volunteer group" }
        }

        // Validate that sold count doesn't exceed allocated quantity
        if (Number(soldCount) > groupItem.quantity) {
            return { error: `Sold count cannot exceed allocated quantity (${groupItem.quantity})` }
        }

        // Update the sales count
        await prisma.directSalesGroupItem.update({
            where: { id: itemId },
            data: { soldCount: Number(soldCount) }
        })

        revalidatePath(`/dashboard/my-fundraising/${group.campaignId}`)
        revalidatePath(`/dashboard/fundraising/${group.campaignId}`)

        return { success: true }
    } catch (error: any) {
        console.error("Error recording volunteer sales:", error)
        return { error: "Failed to record sales" }
    }
}
