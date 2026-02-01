"use server"

import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getTroopContext } from "./tenant-context"
import { ScoutStatus } from "@prisma/client"
import { Decimal } from "decimal.js"

const scoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    age: z.string().optional(),
    status: z.nativeEnum(ScoutStatus),
    email: z.string().refine(val => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), "Invalid email").optional().or(z.literal('')),
    parentId: z.string().optional(),
    initialBalance: z.string().optional(),
})

export async function createScout(prevState: any, formData: FormData) {
    const slug = "troop-1"

    if (!slug) {
        return { error: "Missing troop context" }
    }

    try {
        const { troop } = await getTroopContext(slug, ["ADMIN", "FINANCIER", "LEADER"])

        const rawData = {
            name: formData.get("name"),
            age: formData.get("age"),
            status: formData.get("status"),
            email: formData.get("email"),
            parentId: formData.get("parentId"),
            initialBalance: formData.get("initialBalance"),
        }

        const validatedFields = scoutSchema.safeParse(rawData)

        if (!validatedFields.success) {
            console.error("Scout Validation Error:", validatedFields.error.flatten())
            return { error: "Invalid fields", issues: validatedFields.error.flatten() }
        }

        const { name, age, status, email, parentId, initialBalance } = validatedFields.data

        await prisma.$transaction(async (tx) => {
            const scout = await tx.scout.create({
                data: {
                    name,
                    age: age ? parseInt(age) : null,
                    status,
                    // @ts-ignore
                    email: email || null,
                    ibaBalance: initialBalance ? new Decimal(initialBalance) : new Decimal(0),
                    troopId: troop.id, // Linked to troop
                }
            })

            if (parentId) {
                await tx.parentScout.create({
                    data: {
                        parentId,
                        scoutId: scout.id
                    }
                })
            }
        })

        revalidatePath(`/dashboard/scouts`)
        return { success: true, message: "Scout added successfully" }
    } catch (error: any) {
        console.error("Scout Create Error:", error)
        return { error: error.message || "Failed to create scout" }
    }
}
