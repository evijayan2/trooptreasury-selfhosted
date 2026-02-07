import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { formatCurrency, formatDateEST } from "@/lib/utils"
import { FinanceCard, TransactionItem } from "@/components/finance/finance-card"


import { auth } from "@/auth"
import { notFound, redirect } from "next/navigation"

export default async function FinancePage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user) redirect("/login")

    // Resolve Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // Check permissions
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    // Default to SCOUT if no membership found (should be handled by layout/middleware generally, but safe default)
    const role = membership?.role || "SCOUT"
    const isAdmin = ["ADMIN", "FINANCIER"].includes(role)

    // Fetch summary stats
    const activeBudget = await prisma.budget.findFirst({
        where: {
            status: 'ACTIVE',
            troopId: troop.id
        },
        include: { categories: true }
    })

    const transactions = await prisma.transaction.findMany({
        where: {
            status: 'APPROVED',
            troopId: troop.id
        },
        include: { fundraisingCampaign: true, scout: true },
        orderBy: { createdAt: 'desc' }
    })

    const troopList: TransactionItem[] = []
    const incomeList: TransactionItem[] = []
    const expenseList: TransactionItem[] = []
    const reserveList: TransactionItem[] = []

    let troopIncome = 0
    let troopExpenses = 0
    let scoutFundraisingShare = 0
    let ibaDepositsTotal = 0
    let organizerCashTotal = 0

    const organizerCashList: TransactionItem[] = []

    transactions.forEach(t => {
        const val = Number(t.amount)
        const dateStr = formatDateEST(t.createdAt)

        switch (t.type) {
            case 'REGISTRATION_INCOME':
            case 'DONATION_IN':
            case 'DUES':
            case 'CAMP_TRANSFER':
            case 'IBA_RECLAIM':
                troopIncome += val
                troopList.push({ id: t.id, description: t.description || "No Description", amount: val, date: dateStr })
                incomeList.push({ id: t.id, description: t.description || "No Description", amount: val, date: dateStr })
                break
            case 'EVENT_PAYMENT':
            case 'SCOUT_CASH_TURN_IN':
                organizerCashTotal += val
                organizerCashList.push({ id: t.id, description: t.description || (t.type === 'SCOUT_CASH_TURN_IN' ? "Scout Cash Turn-in" : "Organizer Collected Cash"), amount: val, date: dateStr })
                break
            case 'FUNDRAISING_INCOME':
                const ibaPercent = t.fundraisingCampaign?.ibaPercentage || 0
                const scoutPortion = val * (ibaPercent / 100)

                if (t.fundraisingCampaign?.status === 'CLOSED') {
                    const troopPortion = val - scoutPortion
                    troopIncome += troopPortion
                    scoutFundraisingShare += scoutPortion
                    troopList.push({ id: t.id, description: `${t.description} (Troop Share)`, amount: troopPortion, date: dateStr })
                    incomeList.push({ id: t.id, description: `${t.description} (Troop Share)`, amount: troopPortion, date: dateStr })
                    reserveList.push({ id: t.id, description: `${t.description} (Scout Share)`, amount: scoutPortion, date: dateStr })
                } else {
                    troopIncome += val
                    troopList.push({ id: t.id, description: `${t.description} (Active Sale - 100% to Troop)`, amount: val, date: dateStr })
                    incomeList.push({ id: t.id, description: `${t.description} (Active Sale - 100% to Troop)`, amount: val, date: dateStr })
                }
                break
            case 'EXPENSE':
            case 'REIMBURSEMENT':
            case 'TROOP_PAYMENT':
                // IMPORTANT: Pocket reimbursements (Cash Collection Credit) do NOT touch the bank.
                // They only account for cash already held by organizers.
                const isPocketCredit = t.type === 'REIMBURSEMENT' && t.description?.includes("Cash Collection Credit")

                if (!isPocketCredit) {
                    troopExpenses += val
                    troopList.push({ id: t.id, description: t.description || "No Description", amount: -val, date: dateStr })
                    expenseList.push({ id: t.id, description: t.description || "No Description", amount: val, date: dateStr })
                } else {
                    // This is still an "organizer" transaction, but not a bank one.
                    // We can add it to the organizer cash list as an "offset" if it were a payout, 
                    // but here it's actually the CREDIT for receiving cash.
                }
                break
            case 'IBA_DEPOSIT':
                ibaDepositsTotal += val
                reserveList.push({ id: t.id, description: `${t.description}`, amount: val, date: dateStr })
                break
            case 'INTERNAL_TRANSFER':
                troopExpenses += val
                ibaDepositsTotal += val
                troopList.push({ id: t.id, description: t.description || "Internal Transfer", amount: -val, date: dateStr })
                break
            default:
                break
        }
    })

    const troopFunds = troopIncome - troopExpenses

    const scouts = await prisma.scout.findMany({
        where: {
            status: 'ACTIVE',
            troopId: troop.id
        },
        orderBy: { name: 'asc' }
    })
    const allocatedScoutFunds = Number(scouts.reduce((acc, s) => acc + Number(s.ibaBalance), 0))
    const scoutAccountsList: TransactionItem[] = scouts.map(s => ({
        description: `Current Balance: ${s.name}`,
        amount: Number(s.ibaBalance)
    }))

    const unallocatedReserves = (scoutFundraisingShare + ibaDepositsTotal) - allocatedScoutFunds
    const reservesDisplayList: TransactionItem[] = [
        ...reserveList,
        { description: 'MINUS TOTAL ALLOCATED TO SCOUTS', amount: -allocatedScoutFunds }
    ]

    const totalBankBalance = troopFunds + allocatedScoutFunds + unallocatedReserves
    const allApprovedBankList: TransactionItem[] = [
        ...troopList,
        ...reserveList,
        { description: 'Minus Allocated Scout Funds (offset by reserves)', amount: -allocatedScoutFunds },
        { description: 'Plus Allocated Scout Funds (bank reality)', amount: allocatedScoutFunds }
    ].filter((item, index, self) =>
        // Just show a clean list of what's in the bank
        index === self.findIndex((t) => (
            t.description === item.description && t.amount === item.amount && t.date === item.date
        ))
    )
    // Actually for bank balance card, let's just show income and expenses
    const bankAuditList: TransactionItem[] = [
        ...troopList,
        ...reserveList
    ]

    // Fetch Troop Settings for Export Header
    // Use stored JSON settings if available, or fallback to troop name
    const headerInfo = {
        troopName: troop.name,
        council: troop.council || "",
        district: troop.district || "",
        address: (troop.settings as any)?.address || ""
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <FinanceCard
                    title="Troop Funds"
                    value={troopFunds}
                    description="Available for Troop Use"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                    items={troopList}
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />

                <FinanceCard
                    title="Scout Accounts"
                    value={allocatedScoutFunds}
                    description="Allocated to Individual Scouts"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M19 5h-2V3a1 1 0 0 0-1-1h-8a1 1 0 0 0-1 1v2H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM7 3h10v2H7V3zm12 16H5V7h14v12zM9 10h6v2H9v-2zm0 4h6v2H9v-2z" /></svg>}
                    items={scoutAccountsList}
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />

                <FinanceCard
                    title="Unallocated Reserves"
                    value={unallocatedReserves}
                    description="Fundraising Split to be Allocated"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                    items={reservesDisplayList}
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />

                <FinanceCard
                    title="Total Bank Balance"
                    value={totalBankBalance}
                    description="Actual Bank Account Total"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M2 20h20M4 4h16c1.1 0 2 .9 2 2v1h-3.33L16 11V7h-3v8h-2v-4h-2v4H6V7H3V6c0-1.1.9-2 2-2z" /></svg>}
                    items={bankAuditList}
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />
            </div>
            {organizerCashTotal > 0 && (
                <div className="grid gap-4 md:grid-cols-1">
                    <FinanceCard
                        title="Organizer Collected Cash"
                        value={organizerCashTotal}
                        description="Cash held by Organizers (Audit Only)"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M12 12h.01" /></svg>}
                        items={organizerCashList}
                        headerInfo={headerInfo}
                        isAdmin={isAdmin}
                        slug={slug}
                    />
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <FinanceCard
                    title="YTD Income (Troop)"
                    value={troopIncome}
                    description="Total Troop perspective revenue"
                    icon={<div className="text-green-600 font-bold">↑</div>}
                    items={incomeList}
                    valueClassName="text-green-600"
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />

                <FinanceCard
                    title="YTD Expenses (Troop)"
                    value={troopExpenses}
                    description="Total Troop perspective costs"
                    icon={<div className="text-red-600 font-bold">↓</div>}
                    items={expenseList}
                    valueClassName="text-red-600"
                    headerInfo={headerInfo}
                    isAdmin={isAdmin}
                    slug={slug}
                />

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeBudget ? activeBudget.year : "No Active Budget"}</div>
                        {activeBudget ? (
                            <div className="text-xs text-muted-foreground mt-1">
                                {activeBudget.categories.length} Categories
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">Please configure a budget</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                <div className="bg-muted/50 p-4 rounded-lg text-sm space-y-4">
                    <p>💡 <b>Tip:</b> Click on any of the cards above (Troop Funds, Scout Accounts, etc.) to see a detailed list of transactions making up that total.</p>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="bg-background p-3 rounded border">
                            <p className="font-bold mb-1">Step 1</p>
                            <p className="text-muted-foreground">Go to the <b>Budget</b> tab to set up your annual budget and categories (e.g. Dues, Camping).</p>
                        </div>
                        <div className="bg-background p-3 rounded border">
                            <p className="font-bold mb-1">Step 2</p>
                            <p className="text-muted-foreground">Use the <b>Fundraising</b> menu in the sidebar to manage popcorn sales or other events.</p>
                        </div>
                        <div className="bg-background p-3 rounded border">
                            <p className="font-bold mb-1">Step 3</p>
                            <p className="text-muted-foreground">Record income and expenses in the <b>Expenses</b> tab, linking them to your categories.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
