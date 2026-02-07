
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { UserTable } from "@/components/users/user-table"
import { UserForm } from "@/components/users/user-form"
import { UserImport } from "@/components/users/user-import"

export default async function Page({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) redirect("/login")

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    const role = membership?.role || "SCOUT"

    if (role !== "ADMIN") {
        redirect(`/dashboard`)
    }

    // Fetch Users belonging to this troop
    // We get users via TroopMember
    const troopMembers = await prisma.troopMember.findMany({
        where: { troopId: troop.id },
        include: {
            user: {
                include: {
                    parentLinks: {
                        where: { scout: { troopId: troop.id } }, // Only show links to scouts in this troop
                        include: { scout: true }
                    },
                    // For the "scout" relation on User (legacy direct link), 
                    // we should ensure it matches this troop if possible, or just include it?
                    // The `scout` relation is 1:1. If a user is a scout in THIS troop, show it.
                    scout: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    const users = troopMembers.map(tm => ({
        ...tm.user,
        role: tm.role // CRITICAL: Use the role from the membership, not the global user role
    }))

    const allScouts = await prisma.scout.findMany({
        where: { troopId: troop.id },
        orderBy: { name: 'asc' }
    })

    // Serialize generic Decimal objects for generic Client Component prop passing
    const serializedScouts = allScouts.map(scout => ({
        ...scout,
        ibaBalance: scout.ibaBalance.toNumber(),
    }))

    const serializedUsers = users.map(user => ({
        ...user,
        parentLinks: user.parentLinks.map(link => ({
            ...link,
            scout: {
                ...link.scout,
                ibaBalance: link.scout.ibaBalance.toNumber()
            }
        })),
        scout: (user.scout && user.scout.troopId === troop.id) ? { // Only show scout profile if it belongs to this troop
            ...user.scout,
            ibaBalance: user.scout.ibaBalance.toNumber()
        } : null
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">User Management</h1>
                <div className="flex items-center gap-2">
                    <UserImport slug={slug} />
                    <UserForm slug={slug} />
                </div>
            </div>

            <UserTable users={serializedUsers} allScouts={serializedScouts} slug={slug} />
        </div>
    )
}
