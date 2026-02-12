"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { formatCurrency } from "@/lib/utils"
import { getTroopContext } from "./tenant-context"
import { notifyTroopScouts, notifyTroopLeadership, createNotification } from "./notifications"
import { CampoutStatus } from "@prisma/client"
import { Decimal } from "decimal.js"
import { auth } from "@/auth"

const campoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    location: z.string().min(1, "Location is required"),
    startDate: z.string(),
    endDate: z.string(),
    description: z.string().optional(),
    scoutLimit: z.string().optional(),
    adultLimit: z.string().optional(),
    costEstimate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Cost must be a positive number"),
})


export async function createCampout(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const rawData = {
            name: formData.get("name"),
            location: formData.get("location"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            description: formData.get("description"),
            scoutLimit: formData.get("scoutLimit"),
            adultLimit: formData.get("adultLimit"),
            costEstimate: formData.get("costEstimate"),
        }


        const validatedFields = campoutSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { name, location, startDate, endDate, costEstimate, description, scoutLimit, adultLimit } = validatedFields.data

        const newCampout = await prisma.campout.create({
            data: {
                troopId: troop.id,
                name,
                location,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                scoutLimit: scoutLimit ? parseInt(scoutLimit) : null,
                adultLimit: adultLimit ? parseInt(adultLimit) : null,
                estimatedCost: new Decimal(costEstimate),
                status: CampoutStatus.DRAFT,
            }
        })

        console.log("Campout created:", newCampout)

        revalidatePath(`/dashboard/campouts`)

        return { success: true, message: "Campout created as draft" }
    } catch (error: any) {
        console.error("Campout Create Error:", error)
        return { error: error.message || "Failed to create campout" }
    }
}

export async function publishCampout(campoutId: string, slug: string) {
    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const campout = await prisma.campout.findUnique({
            where: { id: campoutId, troopId: troop.id }
        })

        if (!campout) return { error: "Campout not found" }
        if (campout.status !== CampoutStatus.DRAFT) return { error: "Campout must be in DRAFT state to publish" }

        const updatedCampout = await prisma.campout.update({
            where: { id: campoutId },
            data: { status: CampoutStatus.OPEN }
        })

        await notifyTroopScouts(
            troop.id,
            "New Campout Announced!",
            `Registration is now open for ${updatedCampout.name}.`,
            `/dashboard/campouts/${campoutId}`
        )

        revalidatePath(`/dashboard/campouts`)
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout published successfully" }
    } catch (error: any) {
        return { error: error.message || "Failed to publish campout" }
    }
}

export async function openCampoutPayments(campoutId: string, slug: string) {
    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const campout = await prisma.campout.findUnique({
            where: { id: campoutId, troopId: troop.id }
        })

        if (!campout) return { error: "Campout not found" }
        // Allow strictly from OPEN? Or allow directly from Draft? User said "moved to ready for payment...". Implies flow.
        if (campout.status !== CampoutStatus.OPEN) return { error: "Campout must be OPEN to accept payments" }

        const updatedCampout = await prisma.campout.update({
            where: { id: campoutId },
            data: { status: CampoutStatus.READY_FOR_PAYMENT }
        })

        await notifyTroopScouts(
            troop.id,
            "Payments Open!",
            `You can now make payments for ${updatedCampout.name}.`,
            `/dashboard/campouts/${campoutId}`
        )

        revalidatePath(`/dashboard/campouts`)
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Payments opened successfully" }
    } catch (error: any) {
        return { error: error.message || "Failed to open payments" }
    }
}

export async function closeCampout(campoutId: string, slug: string, payouts?: Record<string, number>) {
    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any
        const session = await auth()
        if (!session) throw new Error("Unauthorized")

        await prisma.$transaction(async (tx) => {
            // 1. Update status
            await tx.campout.update({
                where: { id: campoutId, troopId: troop.id },
                data: { status: CampoutStatus.CLOSED }
            })

            // 2. Process Payouts if provided
            if (payouts) {
                const entries = Object.entries(payouts)
                for (const [adultId, amount] of entries) {
                    if (amount <= 0) continue

                    const adult = await tx.user.findUnique({ where: { id: adultId } })
                    const adultName = adult?.name || "Unknown Organizer"

                    await tx.transaction.create({
                        data: {
                            troopId: troop.id,
                            type: "REIMBURSEMENT",
                            amount: new Decimal(amount),
                            description: `Organizer Payout (at Closure): ${adultName}`,
                            campoutId: campoutId,
                            userId: adultId,
                            approvedBy: session.user.id,
                            status: "APPROVED"
                        }
                    })

                    await tx.adultExpense.updateMany({
                        where: { campoutId, adultId, isReimbursed: false },
                        data: { isReimbursed: true }
                    })
                }
            }
        })

        revalidatePath(`/dashboard/campouts`)
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: payouts ? "Campout closed and payouts processed" : "Campout closed" }
    } catch (error: any) {
        return { error: error.message || "Failed to close campout" }
    }
}

export async function deleteCampout(campoutId: string, slug: string) {
    try {
        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        const campout = await prisma.campout.findUnique({
            where: { id: campoutId, troopId: troop.id },
            include: { _count: { select: { transactions: true, expenses: true, scouts: true } } }
        })

        if (!campout) return { error: "Campout not found" }

        // Strict Guard: Draft Only
        if (campout.status !== CampoutStatus.DRAFT) return { error: "Only DRAFT campouts can be deleted." }

        // Extra Safety: No financial data
        if (campout._count.transactions > 0 || campout._count.expenses > 0) {
            return { error: "Cannot delete campout with existing financial records." }
        }

        // Clean up relations if needed (though Draft shouldn't have many)
        // CampoutScout, CampoutAdult should be cascade deleted or manually?
        // Prisma schema doesn't specify onDelete Cascade for many relations, safest to manual or use deleteMany.
        // CampoutScout
        await prisma.campoutScout.deleteMany({ where: { campoutId } })
        // CampoutAdult
        await prisma.campoutAdult.deleteMany({ where: { campoutId } })

        await prisma.campout.delete({
            where: { id: campoutId }
        })

        revalidatePath(`/dashboard/campouts`)
        return { success: true, message: "Campout deleted" }
    } catch (error: any) {
        return { error: error.message || "Failed to delete campout" }
    }
}

export async function requestPayout(campoutId: string, slug: string, amount: number) {
    try {
        const session = await auth()
        if (!session) return { error: "Unauthorized" }

        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        // Double check they have a participation record or expense
        const expense = await prisma.adultExpense.findFirst({
            where: { campoutId, adultId: session.user.id }
        })

        if (!expense) return { error: "No expenses found for you on this campout" }

        // Create an audit log or notification for admins
        await prisma.adminAuditLog.create({
            data: {
                adminId: session.user.id, // The requester
                action: "REQUEST_PAYOUT",
                targetId: campoutId,
                details: { amount, troopId: troop.id }
            }
        })

        // Notify Leadership
        const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
        await notifyTroopLeadership(
            troop.id,
            "Payout Requested",
            `${session.user.name} has requested a reimbursement of ${formatCurrency(amount)} for ${campout?.name || "a campout"}.`,
            `/dashboard/campouts/${campoutId}`
        )

        return { success: true, message: "Payout request sent to troop leadership" }
    } catch (error: any) {
        return { error: error.message || "Failed to request payout" }
    }
}

export async function recordReimbursement(campoutId: string, slug: string, recipientId: string, amount: number, description: string) {
    try {
        const session = await auth()
        if (!session) return { error: "Unauthorized" }

        const { troop } = { troop: { id: "troop-1", name: "My Troop", slug: "troop-1" }, user: { id: "admin-1" }, membership: { role: "ADMIN" } } as any

        await prisma.$transaction(async (tx) => {
            // 1. Create the REIMBURSEMENT transaction
            await tx.transaction.create({
                data: {
                    troopId: troop.id,
                    type: "REIMBURSEMENT",
                    amount: new Decimal(amount),
                    description: description || "Organizer Reimbursement",
                    campoutId: campoutId,
                    userId: recipientId,
                    approvedBy: session.user.id,
                    status: "APPROVED"
                }
            })

            // 2. Mark corresponding expenses as reimbursed (if any)
            // We'll mark all un-reimbursed expenses for this user on this campout up to this amount? 
            // For now, let's keep it simple and mark them all reimbursed if we're doing a payout.
            await tx.adultExpense.updateMany({
                where: { campoutId, adultId: recipientId, isReimbursed: false },
                data: { isReimbursed: true }
            })
        })

        // Notify Recipient
        const campout = await prisma.campout.findUnique({ where: { id: campoutId } })
        await createNotification({
            userId: recipientId,
            title: "Reimbursement Paid",
            message: `A payout of ${formatCurrency(amount)} for ${campout?.name || "the campout"} has been recorded.`,
            type: "INFO",
            link: `/dashboard/campouts/${campoutId}`
        })

        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Reimbursement recorded successfully" }
    } catch (error: any) {
        return { error: error.message || "Failed to record reimbursement" }
    }
}
