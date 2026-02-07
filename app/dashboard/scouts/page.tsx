import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ScoutTable } from "@/components/scouts/scout-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTableExport } from "@/components/ui/data-table-export"
import { formatCurrency } from "@/lib/utils"
import { AddScoutDialog } from "@/components/scouts/AddScoutDialog"
import { ImportScoutsButton } from "@/components/scouts/ImportScoutsButton"

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    // 1. Fetch Troop & Membership
    const troop = await prisma.troop.findUnique({
        where: { slug }
    })

    if (!troop) {
        return <div>Troop not found</div>
    }

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        },
        include: { user: true }
    })

    const role = membership?.role || "SCOUT" // Default to SCOUT (read-only restriction basically) if no membership found (should be handled by layout though)

    // 2. Role-Based Logic
    if (role === 'SCOUT') {
        const scout = await prisma.scout.findFirst({
            where: {
                userId: session.user.id,
                troopId: troop.id
            }
        })
        if (scout) {
            // Always redirect SCOUT to their detail page (which shows transaction history)
            // This handles both the "Transactions" menu click (view=transactions) and direct access
            redirect(`/dashboard/scouts/${scout.id}`)
        }
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <h2 className="text-xl font-bold text-red-600">Unauthorized</h2>
                <p>No associated scout profile found for your account in this troop.</p>
            </div>
        )
    }

    // 3. Filter scouts for Parents
    let whereClause: any = { troopId: troop.id } // ALWAYS Scope to Troop
    if (role === 'PARENT') {
        const parentScouts = await prisma.parentScout.findMany({
            where: { parentId: session.user.id },
            select: { scoutId: true }
        })
        whereClause = {
            ...whereClause,
            id: { in: parentScouts.map(ps => ps.scoutId) }
        }
    }

    const rawScouts = await prisma.scout.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
    })

    // 4. Identify linked scouts
    const linkedScoutIds = new Set<string>()
    const links = await prisma.parentScout.findMany({
        where: { parentId: session.user.id },
        select: { scoutId: true }
    })
    links.forEach(l => linkedScoutIds.add(l.scoutId))

    const scouts = rawScouts.map(scout => ({
        ...scout,
        ibaBalance: Number(scout.ibaBalance),
        isLinked: linkedScoutIds.has(scout.id)
    }))

    const headerInfo = {
        troopName: troop.name,
        council: troop.council || "",
        district: troop.district || "",
        address: (troop.settings as any)?.address || ""
    }

    const exportData = scouts.map(s => ({
        name: s.name,
        balance: s.ibaBalance,
        formattedBalance: formatCurrency(s.ibaBalance)
    }))

    // Fetch parents for AddScoutDialog (for admin/leader/financier)
    let potentialParents: { id: string, name: string | null }[] = []
    if (['ADMIN', 'FINANCIER', 'LEADER'].includes(role)) {
        // Find users who are members of this troop and NOT just scouts
        const members = await prisma.troopMember.findMany({
            where: {
                troopId: troop.id,
                role: { not: 'SCOUT' }
            },
            include: { user: true },
            orderBy: { user: { name: 'asc' } }
        })
        potentialParents = members.map(m => m.user)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Scouts</h1>
                {['ADMIN', 'FINANCIER', 'LEADER'].includes(role) && (
                    <div className="flex gap-2">
                        <ImportScoutsButton slug={slug} />
                        <AddScoutDialog parents={potentialParents} slug={slug} />
                    </div>
                )}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Roster {role === 'PARENT' ? '(My Scouts)' : ''}</CardTitle>
                    <div className="flex gap-2">
                        <DataTableExport
                            data={exportData}
                            columns={[
                                { header: "Name", accessorKey: "name" },
                                { header: "IBA Balance", accessorKey: "formattedBalance" }
                            ]}
                            filename={`TroopTreasury_ScoutRoster_${new Date().toISOString().split('T')[0]}`}
                            title="Scout Roster"
                            headerInfo={headerInfo}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <ScoutTable scouts={scouts} slug={slug} />
                </CardContent>
            </Card>
        </div>
    )
}
