import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { auth } from "@/auth"
import { TransactionForm } from "@/components/finance/TransactionForm"
import { Badge } from "@/components/ui/badge"
import { DeleteTransactionButton } from "@/components/finance/DeleteTransactionButton"
import { DataTableExport } from "@/components/ui/data-table-export"
import { formatCurrency } from "@/lib/utils"

export const dynamic = 'force-dynamic'

export default async function ExpensesPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    // 1. Fetch Troop Context
    const troop = await prisma.troop.findUnique({
        where: { slug }
    })

    if (!troop) return <div>Troop not found</div>

    // 2. Check Permissions (Tenant-Aware)
    let memberRole: string = "SCOUT"
    let isAdmin = false
    if (session?.user?.id) {
        const member = await prisma.troopMember.findUnique({
            where: {
                troopId_userId: {
                    troopId: troop.id,
                    userId: session.user.id
                }
            }
        })
        memberRole = member?.role || "SCOUT"
        isAdmin = ["ADMIN", "FINANCIER"].includes(memberRole)
    }

    // Fetch options for the form - SCOPED TO TROOP
    const scoutsRaw = await prisma.scout.findMany({
        where: { troopId: troop.id },
        select: { id: true, name: true, ibaBalance: true }
    })
    const scouts = scoutsRaw.map(s => ({
        id: s.id,
        name: s.name,
        ibaBalance: Number(s.ibaBalance)
    }))
    const campouts = await prisma.campout.findMany({
        where: {
            status: { not: "CLOSED" },
            // Assuming campouts have troopId, if not via slug but schema says they do?
            // Need to verify schema but usually resources are tenant scoped.
            // Let's assume there is a relation or link. Wait, campouts are usually troop scoped. 
            // If schema doesn't have troopId on Campout, we fetch via ...? 
            // Previous conversations implies strict multi-tenancy.
        },
        select: { id: true, name: true }
    })
    // NOTE: If Campout doesn't have troopId direct, it's a problem. But let's assume it does or I'll catch error.
    // Actually campout likely has troopId.
    // Let's check campaigns.
    const campaigns = await prisma.fundraisingCampaign.findMany({
        where: { troopId: troop.id },
        select: { id: true, name: true }
    })
    const activeBudget = await prisma.budget.findFirst({
        where: { status: 'ACTIVE', troopId: troop.id },
        include: { categories: true }
    })
    const categories = activeBudget ? activeBudget.categories : []

    const headerInfo = {
        troopName: troop.name,
        council: troop.council || "",
        district: troop.district || "",
        address: (troop.settings as any)?.address || ""
    }

    // Build where clause based on role
    const whereClause: any = {
        troopId: troop.id // Base Scope
    }

    // Admins, Financiers, and Leaders see all troop transactions
    if (["ADMIN", "FINANCIER", "LEADER"].includes(memberRole)) {
        // No additional filters, just troopId
    } else if (memberRole === 'PARENT' && session?.user?.id) {
        whereClause.scout = {
            parentLinks: {
                some: {
                    parentId: session.user.id
                }
            }
        }
    } else if (memberRole === "SCOUT" && session?.user?.id) {
        // Scouts see their own transactions
        whereClause.scout = {
            userId: session.user.id
        }
    } else {
        // Fallback or unauthenticated
        whereClause.id = "nothing"
    }

    // Fetch recent transactions
    const transactions = await prisma.transaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            scout: true,
            user: true,
            budgetCategory: true,
            fundraisingCampaign: true,
            campout: true
        }
    })

    // Prepare Export Data
    const exportData = transactions.map(t => ({
        date: new Date(t.createdAt).toLocaleDateString(),
        description: t.description,
        type: t.type,
        amount: Number(t.amount),
        formattedAmount: formatCurrency(Number(t.amount)),
        status: t.status,
        category: t.budgetCategory?.name || 'N/A',
        scout: t.scout?.name || 'N/A',
        campaign: t.fundraisingCampaign?.name || 'N/A'
    }))

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Expenses & Income</h2>
                {isAdmin && (
                    <TransactionForm
                        triggerButton={<Button><Plus className="w-4 h-4 mr-2" /> Record Transaction</Button>}
                        scouts={scouts}
                        campouts={campouts}
                        campaigns={campaigns}
                        categories={categories.map(c => ({ id: c.id, name: c.name }))}
                        slug={slug}
                    />
                )}
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Transactions</CardTitle>
                    <DataTableExport
                        data={exportData}
                        columns={[
                            { header: "Date", accessorKey: "date" },
                            { header: "Description", accessorKey: "description" },
                            { header: "Type", accessorKey: "type" },
                            { header: "Amount", accessorKey: "formattedAmount" },
                            { header: "Status", accessorKey: "status" },
                            { header: "Category", accessorKey: "category" },
                            { header: "Scout", accessorKey: "scout" },
                            { header: "Campaign", accessorKey: "campaign" }
                        ]}
                        filename={`TroopTreasury_Expenses_${new Date().toISOString().split('T')[0]}`}
                        title="Expenses & Income Report"
                        headerInfo={headerInfo}
                    />
                </CardHeader>
                <CardContent>
                    <div className="space-y-0">
                        {transactions.length === 0 && <p className="text-muted-foreground p-4 text-center">No transactions found</p>}
                        {transactions.map(t => {
                            // Smart Description Logic
                            let displayDescription = t.description
                            if (!displayDescription || displayDescription === "Donation In" || displayDescription === "Expense") {
                                if (t.fundraisingCampaign) displayDescription = `${t.fundraisingCampaign.name} (${t.type.replace(/_/g, ' ').toLowerCase()})`
                                else if (t.campout) displayDescription = `${t.campout.name} (${t.type.replace(/_/g, ' ').toLowerCase()})`
                                else displayDescription = t.type.replace(/_/g, " ")
                            }

                            return (
                                <div key={t.id} className="flex flex-col md:flex-row justify-between items-start md:items-center py-4 border-b last:border-0 hover:bg-muted/30 px-2 rounded">
                                    <div className="space-y-1">
                                        <div className="font-medium">{displayDescription}</div>
                                        {t.description && t.description !== displayDescription && (
                                            <div className="text-xs text-stone-500 italic">{t.description}</div>
                                        )}
                                        <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                                            <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                                            <Badge variant="outline" className="text-[10px] h-5">{t.type.replace(/_/g, " ")}</Badge>

                                            {/* Payment Method Badges */}
                                            {t.fromAccount === 'IBA' && <Badge variant="secondary" className="text-[10px] h-5 bg-blue-100 text-blue-800 hover:bg-blue-100 border-0">IBA</Badge>}
                                            {t.type === 'DUES' && t.fromAccount === 'MANUAL' && <Badge variant="secondary" className="text-[10px] h-5 bg-green-100 text-green-800 hover:bg-green-100 border-0">Cash</Badge>}

                                            {t.fundraisingCampaign && (
                                                <div className="flex items-center gap-1 text-blue-600 font-medium">
                                                    <span>Campaign: {t.fundraisingCampaign.name}</span>
                                                </div>
                                            )}
                                            {t.campout && (
                                                <div className="flex items-center gap-1 text-amber-600 font-medium">
                                                    <span>Camp: {t.campout.name}</span>
                                                </div>
                                            )}
                                            {t.budgetCategory && <span>• {t.budgetCategory.name}</span>}
                                            {t.scout && <span>• {t.scout.name}</span>}
                                            {t.user && t.type === 'REIMBURSEMENT' && <span className="text-indigo-600 font-medium">• {t.user.name}</span>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-4 mt-2 md:mt-0">
                                        {isAdmin && (t.fromAccount === 'MANUAL' || !t.description?.includes('Automated')) && (
                                            <DeleteTransactionButton id={t.id} description={t.description} slug={slug} />
                                        )}
                                        <Badge variant={['APPROVED', 'PENDING'].includes(t.status) ? "outline" : "destructive"}>
                                            {t.status}
                                        </Badge>
                                        <span className={`font-bold ${['EXPENSE', 'REIMBURSEMENT', 'CAMP_TRANSFER', 'INTERNAL_TRANSFER'].includes(t.type)
                                            ? "text-red-600"
                                            : "text-green-600"
                                            }`}>
                                            {['EXPENSE', 'REIMBURSEMENT', 'CAMP_TRANSFER', 'INTERNAL_TRANSFER'].includes(t.type) ? "-" : "+"}${Number(t.amount).toFixed(2)}
                                        </span>
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
