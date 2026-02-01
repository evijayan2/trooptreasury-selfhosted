'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updatePushToken(token: string) {
    const session = await auth()

    if (!session?.user?.email) {
        return { error: "Unauthorized" }
    }

    try {
        await prisma.user.update({
            where: { email: session.user.email },
            data: { pushToken: token },
        })

        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        console.error("Failed to update push token:", error)
        return { error: "Failed to update token" }
    }
}
