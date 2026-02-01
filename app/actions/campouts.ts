"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTroopContext } from "./tenant-context"
import { notifyTroopScouts } from "./notifications"
import { CampoutStatus } from "@prisma/client"
import { Decimal } from "decimal.js"

const campoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    location: z.string().min(1, "Location is required"),
    startDate: z.string(),
    endDate: z.string(),
    costEstimate: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Cost must be a positive number"),
})

export async function createCampout(prevState: any, formData: FormData) {
    const slug = "troop-1"
    if (!slug) return { error: "Missing troop context" }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        const rawData = {
            name: formData.get("name"),
            location: formData.get("location"),
            startDate: formData.get("startDate"),
            endDate: formData.get("endDate"),
            costEstimate: formData.get("costEstimate"),
        }

        const validatedFields = campoutSchema.safeParse(rawData)

        if (!validatedFields.success) {
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { name, location, startDate, endDate, costEstimate } = validatedFields.data

        console.log("Creating Campout with data:", { name, location, startDate, endDate, costEstimate })
        console.log("Explicitly setting status to:", CampoutStatus.DRAFT)

        const newCampout = await prisma.campout.create({
            data: {
                troopId: troop.id,
                name,
                location,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
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
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

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
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

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

export async function closeCampout(campoutId: string, slug: string) {
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        await prisma.campout.update({
            where: { id: campoutId, troopId: troop.id },
            data: { status: CampoutStatus.CLOSED }
        })

        // No notification for closing per requirements

        revalidatePath(`/dashboard/campouts`)
        revalidatePath(`/dashboard/campouts/${campoutId}`)
        return { success: true, message: "Campout closed" }
    } catch (error: any) {
        return { error: error.message || "Failed to close campout" }
    }
}

export async function deleteCampout(campoutId: string, slug: string) {
    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

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
