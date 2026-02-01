import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

/**
 * Get user's role within a specific troop
 * @returns Role if user is a member, null otherwise
 */
export async function getTroopMemberRole(
    userId: string,
    troopId: string
): Promise<Role | null> {
    const member = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId,
                userId
            }
        },
        select: { role: true }
    })
    return member?.role ?? null
}

/**
 * Check if user has permission in troop (has any of the allowed roles)
 * @param userId - User ID to check
 * @param troopId - Troop ID to check membership in
 * @param allowedRoles - Array of roles that are permitted
 * @returns true if user has any of the allowed roles
 */
export async function checkTroopPermission(
    userId: string,
    troopId: string,
    allowedRoles: Role[]
): Promise<boolean> {
    const role = await getTroopMemberRole(userId, troopId)
    return role !== null && allowedRoles.includes(role)
}

/**
 * Get troop context from slug with user validation
 * Used by server actions to validate troop existence and user membership
 * @returns Troop object with user's role, or null if not found/not a member
 */
export async function getTroopContext(slug: string, userId: string) {
    const troop = await prisma.troop.findUnique({
        where: { slug },
        select: { id: true, slug: true, name: true }
    })

    if (!troop) return null

    const member = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId
            }
        },
        select: { role: true }
    })

    if (!member) return null

    return {
        ...troop,
        userRole: member.role
    }
}

/**
 * Check if user is admin in a specific troop
 * Convenience function for the most common check
 */
export async function isTroopAdmin(userId: string, troopId: string): Promise<boolean> {
    return checkTroopPermission(userId, troopId, ["ADMIN"])
}

/**
 * Check if user can manage finances in a troop (ADMIN, FINANCIER, or LEADER)
 */
export async function canManageFinances(userId: string, troopId: string): Promise<boolean> {
    return checkTroopPermission(userId, troopId, ["ADMIN", "FINANCIER", "LEADER"])
}

/**
 * Check if user can manage finances or is the expense owner
 * Used for expense edit/delete operations
 */
export async function canManageExpense(
    userId: string,
    troopId: string,
    expenseOwnerId: string
): Promise<boolean> {
    if (userId === expenseOwnerId) return true
    return canManageFinances(userId, troopId)
}
