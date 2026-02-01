import { notFound, redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { SideNav } from "@/app/ui/dashboard/sidenav"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"

import { Breadcrumbs } from "@/components/ui/breadcrumbs"
import { FooterInfo } from "@/components/dashboard/footer-info"

export default async function TroopLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=/dashboard`)
    }

    // 1. Fetch Troop
    const troop = await prisma.troop.findUnique({
        where: { slug },
    })

    if (!troop) {
        notFound()
    }

    // 2. Check Membership
    // 2. Check Membership
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id,
            },
        },
    })

    if (!membership) {
        // User is logged in but not a member of this troop.
        // Ensure "Unauthorized" page exists or redirect.
        // For now, simple error message or redirect to global home.
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p>You are not a member of {troop.name}.</p>
                <a href="/" className="underline">Go Home</a>
            </div>
        )
    }

    // 3. Lifecycle Status Check
    const allowedRolesInInactive = ["ADMIN", "FINANCIER"]
    const isInactive = ["PAUSED", "GRACE_PERIOD", "PENDING_DELETION"].includes(troop.status)

    if (isInactive) {
        // Block regular users
        if (!allowedRolesInInactive.includes(membership.role)) {
            return (
                <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/50 p-4 text-center">
                    <h1 className="text-2xl font-bold">Troop Unavailable</h1>
                    <p className="max-w-md text-muted-foreground">
                        This troop is currently {troop.status.toLowerCase().replace("_", " ")}.
                        Please contact your Troop Admin for more information.
                    </p>
                    <a href="/" className="underline text-sm">Return Home</a>
                </div>
            )
        }
    }

    // 4. Fetch User Details & Permissions
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { scout: { select: { id: true } } }
    })

    const role = membership.role
    // Use default permissions based on role
    const { DEFAULT_PERMISSIONS } = await import("@/lib/rbac-shared")
    const permissions = DEFAULT_PERMISSIONS[role] || []

    // Scout ID for SCOUT role
    const scoutId = user?.scout?.id

    return (
        <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
            <div className="w-full flex-none md:w-64 hidden md:block">
                <SideNav role={role} permissions={permissions} scoutId={scoutId} slug={slug} />
            </div>

            <div className="flex-grow flex flex-col overflow-hidden bg-gray-50 dark:bg-zinc-900">
                {/* Read-Only Banner */}
                {isInactive && (
                    <div className="flex-none bg-amber-500/10 border-b border-amber-500/20 p-2 text-center text-amber-700 dark:text-amber-500 text-sm font-medium">
                        ⚠️ Read-Only Mode: Troop is {troop.status.replace("_", " ")}. You can view data but not edit.
                    </div>
                )}

                <DashboardHeader
                    user={{
                        name: user?.name,
                        email: user?.email,
                        role: role
                    }}
                    initialColor={user?.preferredColor || "orange"}
                    initialTheme={user?.preferredTheme || "system"}
                    role={role}
                    permissions={permissions}
                    scoutId={scoutId}
                    slug={slug}
                    troopName={troop.name}
                />

                <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
                    <Breadcrumbs />
                    {children}
                </main>

                <footer className="border-t py-4 bg-background flex-none z-10">
                    <FooterInfo />
                </footer>
            </div>
        </div>
    )
}
