"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Add this to app/actions.ts after the toggleUserStatus function

import { isTroopAdmin } from "@/lib/auth-helpers"

export async function unlockUserAccount(userId: string, slug: string) {
    const session = await auth()
    if (!session) return { error: "Unauthorized" }

    // Get troop context
    const troop = await prisma.troop.findUnique({
        where: { slug },
        select: { id: true }
    })
    if (!troop) return { error: "Troop not found" }

    const isAdmin = await isTroopAdmin(session.user.id, troop.id)
    if (!isAdmin) {
        return { error: "Unauthorized - Admin role required" }
    }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastFailedLogin: null
            }
        })
        revalidatePath("/dashboard/users")
        return { success: true, message: "Account unlocked successfully" }
    } catch (error) {
        console.error("Unlock Account Error:", error)
        return { error: "Failed to unlock account" }
    }
}
