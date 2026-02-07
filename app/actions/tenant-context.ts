import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"

export type TroopContext = {
    troop: { id: string; name: string; slug: string }
    user: { id: string; name?: string | null; email?: string | null }
    membership: { role: Role }
}

export async function getTroopContext(slug: string, allowedRoles: Role[] = []): Promise<TroopContext> {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Unauthorized")

    // In self-hosted, we assume the first troop is THE troop
    const troop = await prisma.troop.findFirst()
    if (!troop) throw new Error("No troop configured. Please run seed script.")

    // We also assume the user is an ADMIN if they are the platform admin or the first member
    const membership = await prisma.troopMember.findFirst({
        where: { userId: session.user.id }
    })

    if (!membership) throw new Error("Unauthorized")

    return {
        troop: { id: troop.id, name: troop.name, slug: troop.slug },
        user: { id: session.user.id, name: session.user.name, email: session.user.email },
        membership: { role: membership.role }
    }
}