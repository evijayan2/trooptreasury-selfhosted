"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export type UserTroopMembership = {
    troopId: string
    troopName: string
    troopSlug: string
    role: Role
}

/**
 * Fetches all troop memberships for the current authenticated user.
 * Returns empty array if user is not authenticated.
 */
export async function getUserTroopMemberships(): Promise<UserTroopMembership[]> {
    const session = await auth()

    if (!session?.user?.id) {
        return []
    }

    try {
        const memberships = await prisma.troopMember.findMany({
            where: {
                userId: session.user.id
            },
            include: {
                troop: {
                    select: {
                        id: true,
                        name: true,
                        slug: true
                    }
                }
            },
            orderBy: {
                troop: {
                    name: 'asc'
                }
            }
        })

        return memberships.map((m: any) => ({
            troopId: m.troop.id,
            troopName: m.troop.name,
            troopSlug: m.troop.slug,
            role: m.role
        }))
    } catch (error) {
        console.error("Failed to fetch user troop memberships:", error)
        return []
    }
}

/**
 * Checks if the current user is a scout (has SCOUT role).
 * Scouts can only belong to one troop, so they shouldn't see the troop switcher.
 */
export async function isUserScout(): Promise<boolean> {
    const session = await auth()

    if (!session?.user?.id) {
        return false
    }

    try {
        const scoutMembership = await prisma.troopMember.findFirst({
            where: {
                userId: session.user.id,
                role: Role.SCOUT
            }
        })

        return !!scoutMembership
    } catch (error) {
        console.error("Failed to check if user is scout:", error)
        return false
    }
}
