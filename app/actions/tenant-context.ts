'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { redirect } from "next/navigation"

export type TroopContext = {
    troop: {
        id: string
        name: string
        slug: string
    }
    user: {
        id: string
        name?: string | null
        email?: string | null
    }
    membership: {
        role: Role
    }
}

/**
 * Validates that the current user has access to the specified troop (by slug) 
 * and possesses one of the allowed roles.
 * 
 * @param slug The troop slug
 * @param allowedRoles Array of roles allowed to perform this action. If empty, any member is allowed.
 * @returns The troop context including IDs and membership details.
 * @throws Error if validation fails (which should be caught by the action)
 */
export async function getTroopContext(slug: string, allowedRoles: Role[] = []): Promise<TroopContext> {
    const session = await auth()

    if (!session?.user?.id) {
        throw new Error("Unauthorized: User not authenticated")
    }

    const troop = await prisma.troop.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true }
    })

    if (!troop) {
        throw new Error("Troop not found")
    }

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        },
        select: { role: true }
    })

    if (!membership) {
        throw new Error("Unauthorized: You are not a member of this troop")
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        throw new Error(`Unauthorized: Role ${membership.role} is not permitted to perform this action`)
    }

    return {
        troop,
        user: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email
        },
        membership
    }
}
