import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { Permission, DEFAULT_PERMISSIONS } from "./rbac-shared"

export * from "./rbac-shared"

export async function getRolePermissions(troopId?: string): Promise<Record<Role, Permission[]>> {
    if (troopId) {
        const troop = await prisma.troop.findUnique({ where: { id: troopId } })
        const settings = troop?.settings as any
        if (settings?.rolePermissions) {
            return settings.rolePermissions as Record<Role, Permission[]>
        }
    } else {
        // Fallback for backward compatibility (though this table is deprecated)
        const settings = await prisma.troopSettings.findFirst()
        if (settings?.rolePermissions) {
            return settings.rolePermissions as unknown as Record<Role, Permission[]>
        }
    }
    return DEFAULT_PERMISSIONS
}

export async function hasPermission(role: Role, permission: Permission, troopId?: string): Promise<boolean> {
    if (role === 'ADMIN') return true // Admin always has access

    const permissionsMap = await getRolePermissions(troopId)
    const rolePerms = permissionsMap[role] || []
    return rolePerms.includes(permission)
}
