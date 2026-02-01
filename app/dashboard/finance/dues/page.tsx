import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { TransactionForm } from "@/components/finance/TransactionForm"

export default async function DuesPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    // 1. Fetch Troop Context
    const troop = await prisma.troop.findUnique({
        where: { slug }
    })

    if (!troop) return <div>Troop not found</div>

    // 2. Check Permissions (Tenant-Aware)
    let isAdmin = false
    let isParent = false
    let isScout = false

    if (session?.user?.id) {
        const member = await prisma.troopMember.findUnique({
            where: {
                troopId_userId: {
                    troopId: troop.id,
                    userId: session.user.id
                }
            }
        })
        const role = member?.role || ""
        isAdmin = ["ADMIN", "FINANCIER", "LEADER"].includes(role)
        isParent = role === "PARENT"
        isScout = role === "SCOUT"
    }

    // 3. Get Dues Category from Active Budget
    const activeBudget = await prisma.budget.findFirst({
        where: { status: 'ACTIVE', troopId: troop.id },
        include: { categories: true }
    })

    // FIX: Default to 0 if no budget, do NOT assume 150.
    const targetDues = Number(activeBudget?.annualDuesAmount || 0)

    // Pre-fetch data for TransactionForm
    const allScoutsRaw = await prisma.scout.findMany({
        where: { troopId: troop.id, status: 'ACTIVE' },
        select: { id: true, name: true, ibaBalance: true }
    })
    const allScouts = allScoutsRaw.map(s => ({
        id: s.id,
        name: s.name,
        ibaBalance: Number(s.ibaBalance)
    }))
    const campouts = await prisma.campout.findMany({
        where: { troopId: troop.id, status: { not: "CLOSED" } },
        select: { id: true, name: true }
    })
    const campaigns = await prisma.fundraisingCampaign.findMany({
        where: { troopId: troop.id },
        select: { id: true, name: true }
    })
    const categories = activeBudget ? activeBudget.categories.map(c => ({ id: c.id, name: c.name })) : []

    // 4. Fetch Scouts (Scoped)
    let scouts: any[] = []

    if (isAdmin) {
        scouts = await prisma.scout.findMany({
            where: {
                troopId: troop.id,
                status: 'ACTIVE'
            },
            include: {
                transactions: {
                    where: { type: 'DUES' }
                }
            },
            orderBy: { name: 'asc' }
        })
    } else if (isParent && session?.user?.id) {
        const links = await prisma.parentScout.findMany({
            where: { parentId: session.user.id },
            select: { scoutId: true }
        })
        const scoutIds = links.map(l => l.scoutId)
        scouts = await prisma.scout.findMany({
            where: {
                id: { in: scoutIds },
                troopId: troop.id
            },
            include: { transactions: { where: { type: 'DUES' } } }
        })
    } else if (isScout && session?.user?.email) {
        scouts = await prisma.scout.findMany({
            where: {
                userId: session.user.id,
                troopId: troop.id
            },
            include: { transactions: { where: { type: 'DUES' } } }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Annual Dues</h2>
                {targetDues > 0 ? (
                    <div className="text-sm bg-muted px-3 py-1 rounded">
                        Target: <strong>${targetDues.toFixed(2)}</strong> / scout
                    </div>
                ) : (
                    <div className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded">
                        No Active Budget / Dues Set
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Scout Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        {scouts.length === 0 && <p className="text-muted-foreground text-center py-4">No scouts found.</p>}

                        {scouts.map(scout => {
                            const paid = scout.transactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0)
                            const rawRemaining = targetDues - paid
                            const remaining = Math.max(0, Number.isFinite(rawRemaining) ? rawRemaining : 0)

                            // Adjust status logic
                            let status = "UNPAID"
                            if (targetDues === 0 && paid === 0) status = "NO_DUE"
                            else if (remaining <= 0.01) status = "PAID" // Tolerance for floating point
                            else if (paid > 0) status = "PARTIAL"

                            return (
                                <div key={scout.id} className="flex flex-col sm:flex-row justify-between items-center p-4 border rounded-lg hover:bg-muted/10">
                                    <div className="flex items-center gap-4 mb-2 sm:mb-0">
                                        <div className={`p-2 rounded-full ${status === 'PAID' ? 'bg-green-100 text-green-600' :
                                            status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-600' :
                                                status === 'NO_DUE' ? 'bg-gray-100 text-gray-600' :
                                                    'bg-red-100 text-red-600'
                                            }`}>
                                            {status === 'PAID' ? <CheckCircle className="w-5 h-5" /> :
                                                status === 'PARTIAL' ? <AlertCircle className="w-5 h-5" /> :
                                                    status === 'NO_DUE' ? <CheckCircle className="w-5 h-5" /> :
                                                        <XCircle className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold">{scout.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Paid: ${paid.toFixed(2)}
                                                {targetDues > 0 && (
                                                    <> <span className="text-xs">•</span> Due: ${remaining.toFixed(2)}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        {status !== 'PAID' && status !== 'NO_DUE' && isAdmin && (
                                            <TransactionForm
                                                key={scout.id}
                                                slug={slug}
                                                scouts={allScouts}
                                                campouts={campouts}
                                                campaigns={campaigns}
                                                categories={categories}
                                                defaultValues={{
                                                    type: "DUES",
                                                    scoutId: scout.id,
                                                    description: "Annual Dues Payment",
                                                    amount: remaining.toFixed(2)
                                                }}
                                                triggerButton={
                                                    <Button size="sm" variant="default">
                                                        Record Payment
                                                    </Button>
                                                }
                                            />
                                        )}
                                        {status !== 'PAID' && status !== 'NO_DUE' && !isAdmin && (
                                            <Button size="sm" variant="outline" disabled>
                                                Make Payment (Coming Soon)
                                            </Button>
                                        )}
                                        {(status === 'PAID' || status === 'NO_DUE') && (
                                            <span className="text-sm font-medium text-green-600">
                                                {status === 'NO_DUE' ? 'No Dues Required' : 'Complete'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
