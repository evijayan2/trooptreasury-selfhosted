import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { formatCurrency, cn } from "@/lib/utils"
import { MapPin, CalendarDays, Wallet, Plus, Loader2 } from "lucide-react"
import { CampoutRoster } from "@/components/campouts/campout-roster"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { CampoutAdults } from "@/components/campouts/campout-adults"
import { ReimbursementRecorder } from "@/components/campouts/reimbursement-recorder"
import { ExpenseLogger } from "@/components/campouts/expense-logger"
import { PendingReimbursements } from "@/components/campouts/pending-reimbursements"
import { IBAPayment } from "@/components/campouts/iba-payment"
import { PaymentRecorder } from "@/components/campouts/payment-recorder"
import { FinancialReport } from "@/components/campouts/financial-report"
import { RemoveParticipantButton } from "@/components/campouts/remove-participant-button"
import { PayCashButton } from "@/components/campouts/pay-cash-button"
import { PayoutControls } from "@/components/campouts/payout-controls"
import { Badge } from "@/components/ui/badge"
import { CampoutLifecycleActions } from "@/components/campouts/campout-lifecycle-actions"
import { JoinCampoutButton } from "@/components/campouts/join-campout-button"
import { JoinAsAdultButton } from "@/components/campouts/join-as-adult-button"
import { RegisterLinkedScoutButton } from "@/components/campouts/register-linked-scout-button"
import { AddAttendeeDialog } from "@/components/campouts/add-attendee-dialog"
import { RefundButton } from "@/components/campouts/refund-button"
import { PromoteButton, DemoteButton } from "@/components/campouts/roster-controls"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function Page({ params }: { params: Promise<any> }) {
    const { id, slug } = await params
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login")
    }

    const campout: any = await prisma.campout.findUnique({
        where: { id },
        include: {
            scouts: { include: { scout: true } },
            transactions: {
                include: {
                    scout: true,
                    user: true
                }
            },
            expenses: { include: { adult: true } },
            adults: { include: { adult: true } }
        }
    })

    if (!campout) notFound()

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })

    const role = membership?.role || "SCOUT"

    const parentLinks = await prisma.parentScout.findMany({
        where: { parentId: session?.user?.id },
        include: { scout: true }
    })
    const allLinkedScouts = parentLinks.map((pl: any) => pl.scout)

    let currentUserScout = null
    if (role === 'SCOUT') {
        currentUserScout = await prisma.scout.findUnique({ where: { userId: session?.user?.id } })
    }

    const allScouts = await prisma.scout.findMany({
        where: {
            status: "ACTIVE",
            troopId: campout.troopId
        }
    })
    const allAdults = await prisma.user.findMany({
        where: {
            troopMemberships: {
                some: {
                    troopId: campout.troopId,
                    role: { in: ["ADMIN", "LEADER", "FINANCIER", "PARENT"] }
                }
            }
        }
    })

    const allParentScouts = await prisma.parentScout.findMany({
        where: {
            parentId: { in: campout.adults.map((a: any) => a.adultId) }
        },
        include: { scout: true }
    })

    const adultToScoutsMap = new Map<string, any[]>()
    allParentScouts.forEach((ps: any) => {
        if (!adultToScoutsMap.has(ps.parentId)) {
            adultToScoutsMap.set(ps.parentId, [])
        }
        adultToScoutsMap.get(ps.parentId)?.push(ps.scout)
    })

    const expenses = campout.transactions.filter((t: any) =>
        ["EXPENSE", "REIMBURSEMENT"].includes(t.type)
    )

    const directExpenses = campout.transactions.filter((t: any) =>
        t.type === "EXPENSE" && !t.description?.includes("Refund") && t.status === "APPROVED"
    )
    const transactionsCost = directExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const adultExpensesCost = campout.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)
    const totalCampoutCost = transactionsCost + adultExpensesCost

    const adultRoleMap = new Map<string, { adult: any, roles: Set<string>, status: "RESERVED" | "WAITLISTED" | null }>()
    campout.adults.forEach((a: any) => {
        if (!adultRoleMap.has(a.adultId)) {
            adultRoleMap.set(a.adultId, { adult: a.adult, roles: new Set(), status: a.status })
        }
        adultRoleMap.get(a.adultId)!.roles.add(a.role)
        if (a.status === "RESERVED") {
            adultRoleMap.get(a.adultId)!.status = "RESERVED"
        }
    })

    const paidLinkIds = new Set(campout.expenses.map((e: any) => e.adultId))
    const organizers = Array.from(adultRoleMap.values())
        .filter(({ roles, adult }: any) => roles.has("ORGANIZER") || paidLinkIds.has(adult.id))
        .map(({ adult, roles }: any) => ({ adult, roles: Array.from(roles), adultId: adult.id }))

    const attendees = Array.from(adultRoleMap.values())
        .filter(({ roles }: any) => roles.has("ATTENDEE"))
        .map(({ adult, roles, status }: any) => ({ adult, roles: Array.from(roles), adultId: adult.id, status }))

    const reservedAttendeesCount = attendees.filter((a: any) => a.status === "RESERVED" || !a.status).length
    const availableAdultAttendees = allAdults.filter((u: any) =>
        !attendees.some((a: any) => a.adultId === u.id) &&
        !organizers.some((o: any) => o.adultId === u.id)
    )

    const reservedScoutsData = campout.scouts.filter((s: any) => s.status === 'RESERVED' || !s.status)
    const scoutCount = reservedScoutsData.length
    const totalPeople = scoutCount + reservedAttendeesCount
    const rawCost = totalPeople > 0 ? totalCampoutCost / totalPeople : 0
    const costPerPerson = Math.round(rawCost * 100) / 100

    const linkedScouts = allLinkedScouts.filter((s: any) => campout.scouts.some((cs: any) => cs.scoutId === s.id))
    if (role === 'SCOUT' && currentUserScout && campout.scouts.some((cs: any) => cs.scoutId === currentUserScout.id)) {
        if (!linkedScouts.find((ls: any) => ls.id === currentUserScout.id)) {
            linkedScouts.push(currentUserScout)
        }
    }

    const pendingExpenses = campout.expenses.filter((e: any) => !e.isReimbursed)
    const canApprove = ["ADMIN", "FINANCIER"].includes(role)
    const serializedPendingExpenses = pendingExpenses.map((e: any) => ({ ...e, amount: Number(e.amount) }))

    const serializedExpenses = [
        ...expenses.map((t: any) => ({
            ...t,
            amount: Number(t.amount),
            scout: t.scout ? { ...t.scout, ibaBalance: Number(t.scout.ibaBalance) } : null,
            entryType: 'TRANSACTION'
        })),
        ...campout.expenses.map((e: any) => ({
            id: e.id,
            createdAt: e.createdAt,
            type: 'EXPENSE',
            description: `${e.description} (${e.adult.name})`,
            amount: Number(e.amount),
            status: e.isReimbursed ? 'APPROVED' : 'PENDING',
            entryType: 'ADULT_EXPENSE'
        }))
    ].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const organizersWithExpenses = organizers.map((org: any) => {
        const totalExpenses = campout.expenses
            .filter((e: any) => e.adultId === org.adultId)
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)
        const totalReimbursed = campout.transactions
            .filter((t: any) => t.type === 'REIMBURSEMENT' && t.userId === org.adultId)
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
        const netBalance = totalExpenses - totalReimbursed
        return {
            adultId: org.adultId,
            adultName: org.adult.name,
            totalSpent: totalExpenses,
            totalReimbursed: totalReimbursed,
            netBalance: netBalance,
            pendingExpense: Math.max(0, netBalance),
            excessHoldings: Math.max(0, -netBalance)
        }
    })

    const organizersHeldTotal = campout.transactions
        .filter((t: any) => t.type === "REIMBURSEMENT" && t.description?.includes("Cash Collection") && t.status === "APPROVED")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const cashHeldPerOrganizer = new Map<string, number>()
    campout.transactions
        .filter((t: any) => t.type === "REIMBURSEMENT" && t.description?.includes("Cash Collection") && t.status === "APPROVED")
        .forEach((t: any) => {
            const current = cashHeldPerOrganizer.get(t.userId!) || 0
            cashHeldPerOrganizer.set(t.userId!, current + Number(t.amount))
        })

    const myAdultRecords = campout.adults.filter((a: any) => a.adultId === session?.user?.id)
    const hasExpense = campout.expenses.some((e: any) => e.adultId === session?.user?.id)
    const isOrganizer = myAdultRecords.some((a: any) => a.role === "ORGANIZER") || hasExpense

    const isClosed = campout.status === "CLOSED"
    const canViewFinances = ["ADMIN", "FINANCIER"].includes(role) || isOrganizer
    const canViewRoster = ["ADMIN", "FINANCIER", "LEADER", "SCOUT", "PARENT"].includes(role) || isOrganizer || organizers.some((o: any) => o.adultId === session?.user?.id)

    const serializedAllLinkedScouts = allLinkedScouts.map((s: any) => ({
        ...s,
        ibaBalance: Number(s.ibaBalance)
    }))

    const allScoutsWithDetails = campout.scouts.map((cs: any) => {
        const paidGross = campout.transactions
            .filter((t: any) =>
                (["CAMP_TRANSFER", "EVENT_PAYMENT", "REGISTRATION_INCOME"].includes(t.type) || t.type.startsWith("TROOP")) &&
                t.scoutId === cs.scout.id &&
                !t.userId &&
                t.status === "APPROVED" &&
                !t.description?.includes("Refund")
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const refunded = campout.transactions
            .filter((t: any) =>
                (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") &&
                t.scoutId === cs.scout.id &&
                !t.userId &&
                t.description?.includes("Refund") &&
                t.status === "APPROVED"
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const netPaid = paidGross - refunded
        const isPaid = netPaid >= costPerPerson
        const remainingDue = cs.status === 'WAITLISTED' ? 0 : Math.max(0, costPerPerson - netPaid)
        const overpaidAmount = Math.max(0, netPaid - costPerPerson)
        return {
            ...cs,
            name: cs.scout.name,
            type: 'SCOUT' as const,
            isPaid,
            remainingDue,
            overpaidAmount,
            entityId: cs.scout.id,
            ibaBalance: Number(cs.scout.ibaBalance)
        }
    })

    const allAttendeesWithDetails = attendees.map((a: any) => {
        const paidGross = campout.transactions
            .filter((t: any) => t.userId === a.adultId && ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT", "TROOP_PAYMENT"].includes(t.type) && t.status === "APPROVED" && !t.description?.includes("Refund"))
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const refundedAmount = campout.transactions
            .filter((t: any) => (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.userId === a.adultId && t.description?.includes("Refund") && t.status === "APPROVED")
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const netPaid = paidGross - refundedAmount
        const isPaid = netPaid >= costPerPerson
        const remainingDue = a.status === 'WAITLISTED' ? 0 : Math.max(0, costPerPerson - netPaid)
        const overpaidAmount = Math.max(0, netPaid - costPerPerson)

        return {
            ...a,
            name: a.adult.name,
            type: 'ADULT' as const,
            isPaid,
            remainingDue,
            overpaidAmount,
            entityId: a.adultId
        }
    })

    const reservedScouts = allScoutsWithDetails.filter((s: any) => s.status === 'RESERVED' || !s.status).sort((a: any, b: any) => a.name.localeCompare(b.name))
    const reservedAdults = allAttendeesWithDetails.filter((a: any) => a.status === 'RESERVED' || !a.status).sort((a: any, b: any) => a.name.localeCompare(b.name))

    const waitlistedScouts = allScoutsWithDetails.filter((s: any) => s.status === 'WAITLISTED').sort((a: any, b: any) => (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime()))
    const waitlistedAdults = allAttendeesWithDetails.filter((a: any) => a.status === 'WAITLISTED').sort((a: any, b: any) => (new Date(a.createdAt || 0).getTime()) - (new Date(b.createdAt || 0).getTime()))

    const waitlistedRosterCount = waitlistedScouts.length + waitlistedAdults.length

    const currentScoutsForMinimalRoster = allScoutsWithDetails.map((s: any) => ({
        ...s,
        scout: { ...s.scout, ibaBalance: Number(s.scout.ibaBalance) }
    }))

    const renderRosterItem = (item: any) => {
        const isMe = item.type === 'ADULT' && item.entityId === session?.user?.id
        const isLinkedScout = item.type === 'SCOUT' && allLinkedScouts.some((s: any) => s.id === item.entityId)
        const canSeeDetailedFinances = ["ADMIN", "LEADER", "FINANCIER"].includes(role) || isOrganizer || isMe || isLinkedScout
        const canEditParticipant = ["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed

        return (
            <li key={`${item.type}-${item.entityId}`} className="flex justify-between items-center p-3 bg-white dark:bg-muted/50 border border-transparent hover:border-blue-200 dark:hover:border-blue-900 rounded-lg transition-all group">
                <div className="flex items-center gap-2">
                    <span className={cn("font-medium", isMe && "text-blue-600 dark:text-blue-400 font-bold")}>
                        {item.name}
                        {item.type === 'ADULT' && <span className="ml-1.5 text-[10px] text-muted-foreground uppercase tracking-tight font-normal text-muted-foreground/60">(Adult)</span>}
                    </span>
                    {canEditParticipant && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                            {item.status === 'RESERVED' || !item.status ? (
                                <DemoteButton campoutId={campout.id} id={item.entityId} type={item.type} name={item.name} />
                            ) : (
                                <PromoteButton campoutId={campout.id} id={item.entityId} type={item.type} name={item.name} />
                            )}
                            <RemoveParticipantButton campoutId={campout.id} id={item.entityId} type={item.type} />
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {canSeeDetailedFinances ? (
                        <>
                            {item.overpaidAmount > 0 ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-600 font-semibold">Refund Due: {formatCurrency(item.overpaidAmount)}</span>
                                    {canEditParticipant && (
                                        <RefundButton
                                            campoutId={campout.id}
                                            entityId={item.entityId}
                                            entityType={item.type}
                                            refundAmount={item.overpaidAmount}
                                            entityName={item.name}
                                            hasIbaAccount={item.type === 'SCOUT'}
                                        />
                                    )}
                                </div>
                            ) : item.isPaid ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 rounded text-[10px] font-bold uppercase tracking-wider">PAID</span>
                            ) : (
                                <span className="text-xs text-rose-500 font-semibold">{formatCurrency(item.remainingDue)} Due</span>
                            )}
                        </>
                    ) : (
                        <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            item.isPaid ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-500" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        )}>
                            {item.isPaid ? "Reserved" : "Confirmed"}
                        </span>
                    )}
                </div>
            </li>
        )
    }

    const myScoutsData = linkedScouts.map((scout: any) => {
        const details = allScoutsWithDetails.find((s: any) => s.entityId === scout.id)
        return { ...scout, ...details }
    })

    const isParticipatingAdult = attendees.some((a: any) => a.adultId === session?.user?.id) || organizers.some((o: any) => o.adultId === session?.user?.id)
    const myAdultPaymentData = allAttendeesWithDetails.find((a: any) => a.adultId === session?.user?.id)

    const totalCollected = campout.transactions
        .filter((t: any) =>
            (["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT", "TROOP_PAYMENT"].includes(t.type) || t.type.startsWith("TROOP")) &&
            t.status === "APPROVED"
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0) -
        campout.transactions
            .filter((t: any) => (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.description?.includes("Refund") && t.status === "APPROVED")
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const canViewFinancesFull = ["ADMIN", "FINANCIER"].includes(role) || isOrganizer

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 pb-6 border-b">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <Badge variant={
                            campout.status === 'OPEN' ? 'default' :
                                campout.status === 'READY_FOR_PAYMENT' ? 'secondary' : 'outline'
                        } className="h-6">
                            {campout.status.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1.5 underline decoration-primary/20 decoration-2 underline-offset-4">
                            <MapPin className="w-3.5 h-3.5" /> {campout.location}
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                        {campout.name}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> {new Date(campout.startDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} - {campout.endDate ? new Date(campout.endDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}</span>
                    </div>
                </div>

                <div className="flex gap-8 bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-xl border border-blue-100/50 dark:border-blue-900/30">
                    <div className="text-right">
                        <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Est. Total</div>
                        <div className="text-2xl font-black">{campout.estimatedCost ? formatCurrency(Number(campout.estimatedCost)) : 'N/A'}</div>
                    </div>
                    <div className="w-px bg-blue-200/50 dark:bg-blue-800" />
                    <div className="text-right">
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider mb-1">Per Person</div>
                        <div className="text-3xl font-black text-primary">{formatCurrency(costPerPerson)}</div>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Description Section */}
                    {campout.description && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-3 bg-primary rounded-full" />
                                Details
                            </h3>
                            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap bg-white dark:bg-muted/30 p-5 rounded-xl border shadow-sm">
                                {campout.description}
                            </p>
                        </div>
                    )}

                    {/* Financial Summary Card (Admin/Organizer) */}
                    {canViewFinances && (
                        <Card className="overflow-hidden border-2 border-blue-100/50 dark:border-blue-900/20 shadow-md">
                            <CardHeader className="bg-blue-50/30 dark:bg-blue-950/10 border-b">
                                <div className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                                            <Wallet className="w-5 h-5 text-blue-600" />
                                            Financial Tracking
                                        </CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">Real-time expenditure and collection status</p>
                                    </div>
                                    <div className="flex gap-3 text-sm">
                                        <div className="px-3 py-1 bg-white dark:bg-muted border rounded-lg shadow-sm">
                                            <span className="text-muted-foreground mr-1.5 uppercase text-[10px] font-bold">Collected</span>
                                            <span className="text-green-600 font-black">{formatCurrency(totalCollected)}</span>
                                        </div>
                                        <div className="px-3 py-1 bg-white dark:bg-muted border rounded-lg shadow-sm">
                                            <span className="text-muted-foreground mr-1.5 uppercase text-[10px] font-bold">Net</span>
                                            <span className={cn("font-black", totalCollected - totalCampoutCost >= 0 ? "text-green-600" : "text-rose-600")}>
                                                {formatCurrency(totalCollected - totalCampoutCost)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="p-6 space-y-6">
                                    {canApprove && serializedPendingExpenses.length > 0 && (
                                        <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4">
                                            <PendingReimbursements
                                                expenses={serializedPendingExpenses}
                                                isReadOnly={campout.status !== 'OPEN'}
                                            />
                                        </div>
                                    )}

                                    {serializedExpenses.length > 0 ? (
                                        <div className="border rounded-xl bg-white dark:bg-transparent overflow-hidden">
                                            <TransactionTable
                                                transactions={serializedExpenses}
                                                isReadOnly={campout.status !== 'OPEN'}
                                            />
                                        </div>
                                    ) : (
                                        <p className="text-muted-foreground text-sm italic py-4 text-center">No transactions recorded yet.</p>
                                    )}

                                    {/* Organizer Holdings */}
                                    {organizersHeldTotal > 0 && (
                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <h4 className="text-sm font-bold mb-3 text-muted-foreground flex items-center gap-2 uppercase tracking-wide">
                                                <Wallet className="w-4 h-4" />
                                                Cash with Organizers
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {Array.from(cashHeldPerOrganizer.entries()).map(([uId, amt]) => (
                                                    <div key={uId} className="flex justify-between items-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-900/50 border">
                                                        <span className="text-xs font-semibold">
                                                            {organizers.find((o: any) => o.adultId === uId)?.adult.name || "Organizer"}
                                                        </span>
                                                        <span className="text-xs text-amber-600 font-black">{formatCurrency(amt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Roster Card */}
                    {canViewRoster && (
                        <Card className="shadow-md border-2 overflow-hidden bg-white dark:bg-card">
                            <CardHeader className="flex flex-row items-center justify-between border-b bg-gray-50/50 dark:bg-muted/20">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-xl font-bold">Registration & Roster</CardTitle>
                                        <div className="flex gap-2">
                                            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 font-bold uppercase tracking-tighter text-[10px]">
                                                Scouts: {reservedScouts.length} / {campout.scoutLimit || "∞"}
                                            </Badge>
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 font-bold uppercase tracking-tighter text-[10px]">
                                                Adults: {reservedAdults.length}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {waitlistedRosterCount > 0 && (
                                            <Badge variant="outline" className="text-amber-600 border-amber-200 dark:border-amber-900 font-black text-[10px] uppercase tracking-wider">
                                                {waitlistedRosterCount} Waitlisted
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {(campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && !isClosed && (
                                        <div className="flex items-center gap-2 border-r pr-3 mr-1">
                                            <CampoutRoster
                                                campoutId={campout.id}
                                                registeredScouts={currentScoutsForMinimalRoster}
                                                allScouts={allScouts}
                                                canEdit={false}
                                                costPerPerson={costPerPerson}
                                                campoutStatus={campout.status}
                                                slug={slug}
                                                scoutLimit={campout.scoutLimit}
                                                userRole={role}
                                                currentUserId={session?.user?.id}
                                                allLinkedScoutIds={allLinkedScouts.map((s: any) => s.id)}
                                                minimalMode={true}
                                            />
                                            {["ADMIN", "LEADER", "FINANCIER"].includes(role) && (
                                                <AddAttendeeDialog campoutId={campout.id} slug={slug} availableAdults={availableAdultAttendees.map((a: any) => ({ id: a.id, name: a.name || a.email || "Unknown" }))} />
                                            )}
                                        </div>
                                    )}

                                    {["ADMIN", "FINANCIER", "LEADER"].includes(role) && (
                                        <div className="flex items-center gap-2">
                                            {campout.status !== 'CLOSED' && (
                                                <CampoutLifecycleActions
                                                    campoutId={campout.id}
                                                    slug={slug}
                                                    status={campout.status}
                                                    campoutName={campout.name}
                                                />
                                            )}
                                            <PayoutControls
                                                campoutId={campout.id}
                                                slug={slug}
                                                status={campout.status}
                                                organizers={organizersWithExpenses}
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-8">
                                {/* Reserved Sections Split */}
                                <div className="grid gap-8 sm:grid-cols-2">
                                    {/* Scouts Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Reserved Scouts ({reservedScouts.length})</h4>
                                            <div className="h-px flex-1 bg-blue-100 dark:bg-blue-900/30" />
                                        </div>
                                        <ul className="grid gap-2">
                                            {reservedScouts.map(renderRosterItem)}
                                            {reservedScouts.length === 0 && (
                                                <li className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg italic">No scouts yet</li>
                                            )}
                                        </ul>
                                    </div>

                                    {/* Adults Column */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Reserved Adults ({reservedAdults.length})</h4>
                                            <div className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/30" />
                                        </div>
                                        <ul className="grid gap-2">
                                            {reservedAdults.map(renderRosterItem)}
                                            {reservedAdults.length === 0 && (
                                                <li className="text-center py-4 text-xs text-muted-foreground border border-dashed rounded-lg italic">No adults yet</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>

                                {/* Waitlist Sections Split */}
                                {waitlistedRosterCount > 0 && (
                                    <div className="pt-6 border-t">
                                        <div className="flex items-center gap-2 mb-6">
                                            <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 italic">Waitlist Queue</h4>
                                            <div className="h-px flex-1 bg-amber-100 dark:bg-amber-900/30" />
                                        </div>
                                        <div className="grid gap-8 sm:grid-cols-2">
                                            {/* Waitlisted Scouts */}
                                            <div className="space-y-3">
                                                <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Waitlisted Scouts ({waitlistedScouts.length})</h5>
                                                <ul className="grid gap-2">
                                                    {waitlistedScouts.map((item: any, idx: number) => (
                                                        <li key={`${item.type}-${item.entityId}`} className="flex justify-between items-center p-2.5 bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/30 dark:border-amber-900/10 rounded-lg group">
                                                            <div className="flex items-center gap-2.5 text-xs">
                                                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[9px] font-black">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-semibold">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed && (
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                                                        <PromoteButton campoutId={campout.id} id={item.entityId} type={item.type} name={item.name} />
                                                                        <RemoveParticipantButton campoutId={campout.id} id={item.entityId} type={item.type} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                    {waitlistedScouts.length === 0 && <p className="text-[10px] italic text-muted-foreground px-1">None</p>}
                                                </ul>
                                            </div>

                                            {/* Waitlisted Adults */}
                                            <div className="space-y-3">
                                                <h5 className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Waitlisted Adults ({waitlistedAdults.length})</h5>
                                                <ul className="grid gap-2">
                                                    {waitlistedAdults.map((item: any, idx: number) => (
                                                        <li key={`${item.type}-${item.entityId}`} className="flex justify-between items-center p-2.5 bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/30 dark:border-amber-900/10 rounded-lg group">
                                                            <div className="flex items-center gap-2.5 text-xs">
                                                                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 text-[9px] font-black">
                                                                    {idx + 1}
                                                                </span>
                                                                <span className="font-semibold">{item.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed && (
                                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                                                                        <PromoteButton campoutId={campout.id} id={item.entityId} type={item.type} name={item.name} />
                                                                        <RemoveParticipantButton campoutId={campout.id} id={item.entityId} type={item.type} />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </li>
                                                    ))}
                                                    {waitlistedAdults.length === 0 && <p className="text-[10px] italic text-muted-foreground px-1">None</p>}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Management specific buttons moved to Roster Header */}
                                {!isClosed && campout.status === 'OPEN' && (
                                    <ExpenseLogger
                                        campoutId={campout.id}
                                        adults={campout.adults}
                                        allAdults={allAdults}
                                        currentUserId={session?.user?.id}
                                        userRole={role}
                                        isOrganizer={isOrganizer}
                                        className="w-full"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    {/* My Status Section */}
                    {(myAdultPaymentData || myScoutsData.length > 0) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <span className="w-1 h-3 bg-blue-500 rounded-full" />
                                My Status
                            </h3>

                            <div className="space-y-4">
                                {/* Current User Status */}
                                {myAdultPaymentData && (
                                    <div className="bg-white dark:bg-card border-2 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-lg">My Registration</h4>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Adult Participant</p>
                                            </div>
                                            {myAdultPaymentData.isPaid && (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[10px] font-bold tracking-widest">PAID</Badge>
                                            )}
                                        </div>

                                        <div className="pt-2 flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-wider">{myAdultPaymentData.status === 'WAITLISTED' ? 'Status' : 'Balance'}</div>
                                                <div className={cn("text-2xl font-black", myAdultPaymentData.overpaidAmount > 0 ? "text-amber-600" : "text-gray-900 dark:text-gray-100")}>
                                                    {myAdultPaymentData.status === 'WAITLISTED' ? 'WAITLISTED' : formatCurrency(myAdultPaymentData.overpaidAmount > 0 ? myAdultPaymentData.overpaidAmount : myAdultPaymentData.remainingDue)}
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground">{myAdultPaymentData.status === 'WAITLISTED' ? "Awaiting Opening" : (myAdultPaymentData.overpaidAmount > 0 ? "Refund Due" : "Amount Due")}</div>
                                            </div>
                                        </div>

                                        {!myAdultPaymentData.isPaid && (
                                            <div className="pt-4 flex flex-col gap-2">
                                                {campout.status === 'READY_FOR_PAYMENT' && !isClosed ? (
                                                    <>
                                                        <IBAPayment
                                                            campoutId={campout.id}
                                                            linkedScouts={serializedAllLinkedScouts}
                                                            defaultAmount={costPerPerson}
                                                            beneficiaryId={session?.user?.id}
                                                            disabled={!serializedAllLinkedScouts.some((s: any) => s.ibaBalance >= costPerPerson) || myAdultPaymentData.status === 'WAITLISTED'}
                                                            label={myAdultPaymentData.status === 'WAITLISTED' ? "Waitlisted" : "Pay via IBA"}
                                                            className="w-full h-10 shadow-sm"
                                                        />
                                                        <PayCashButton
                                                            message={`Pay ${formatCurrency(costPerPerson)} to organizer.`}
                                                            disabled={myAdultPaymentData.status === 'WAITLISTED'}
                                                            label={myAdultPaymentData.status === 'WAITLISTED' ? "Waitlisted" : "Pay Cash"}
                                                        />
                                                    </>
                                                ) : (
                                                    <p className="text-[11px] text-center italic text-muted-foreground font-bold py-2 bg-muted/30 rounded-lg">
                                                        {isClosed ? "Campout Closed" : "Waiting for payment phase"}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Linked Scouts Status */}
                                {myScoutsData.map((scout: any) => (
                                    <div key={scout.id} className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-100/50 dark:border-blue-900/50 rounded-2xl p-5 shadow-sm space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-black text-lg text-blue-900 dark:text-blue-200">{scout.name}</h4>
                                                <div className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 flex items-center gap-1 uppercase tracking-tight">
                                                    <Wallet className="w-3 h-3" />
                                                    IBA Balance: {formatCurrency(scout.ibaBalance)}
                                                </div>
                                            </div>
                                            {scout.isPaid && (
                                                <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-[10px] font-bold tracking-widest">PAID</Badge>
                                            )}
                                        </div>

                                        <div className="pt-2 flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] font-black uppercase text-blue-400">{scout.status === 'WAITLISTED' ? 'Status' : 'Balance'}</div>
                                                <div className={cn("text-2xl font-black", scout.overpaidAmount > 0 ? "text-amber-600" : "text-blue-900 dark:text-blue-100")}>
                                                    {scout.status === 'WAITLISTED' ? 'WAITLISTED' : formatCurrency(scout.overpaidAmount > 0 ? scout.overpaidAmount : scout.remainingDue)}
                                                </div>
                                                <div className="text-[10px] font-bold text-muted-foreground">{scout.status === 'WAITLISTED' ? "Awaiting Opening" : (scout.overpaidAmount > 0 ? "Refund Due" : "Amount Due")}</div>
                                            </div>
                                            {!scout.isPaid && (
                                                <div className="flex flex-col gap-2 min-w-[120px]">
                                                    {campout.status === 'READY_FOR_PAYMENT' && !isClosed ? (
                                                        <>
                                                            <IBAPayment
                                                                campoutId={campout.id}
                                                                linkedScouts={[{ ...scout, ibaBalance: Number(scout.ibaBalance) }]}
                                                                defaultAmount={scout.remainingDue}
                                                                disabled={scout.ibaBalance <= 0 || scout.status === 'WAITLISTED'}
                                                                label={scout.status === 'WAITLISTED' ? "Waitlisted" : "Pay IBA"}
                                                                className="h-8 shadow-sm"
                                                            />
                                                            <PayCashButton
                                                                message={`Pay ${formatCurrency(scout.remainingDue)} to organizer.`}
                                                                disabled={scout.status === 'WAITLISTED'}
                                                                label={scout.status === 'WAITLISTED' ? "Waitlisted" : "Pay Cash"}
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] italic text-muted-foreground font-black text-right pr-1">
                                                            {isClosed ? "Closed" : "Pending"}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Join Section */}
                    <div className="bg-gray-50 dark:bg-muted/10 border-2 border-dashed rounded-2xl p-6 text-center space-y-4">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white dark:bg-muted shadow-sm border mb-2">
                            <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-black">Join Campout</h4>
                        <p className="text-xs text-muted-foreground font-medium">Add yourself or linked scouts to the roster</p>

                        <div className="flex flex-col gap-2">
                            {role !== 'SCOUT' && !isParticipatingAdult && !isClosed && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                                <JoinAsAdultButton campoutId={campout.id} slug={slug} className="w-full" />
                            )}

                            {role === 'SCOUT' && currentUserScout && !allScoutsWithDetails.some((rs: any) => rs.entityId === currentUserScout.id) && !isClosed && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                                <JoinCampoutButton campoutId={campout.id} scoutId={currentUserScout.id} className="w-full" />
                            )}

                            {allLinkedScouts
                                .filter((s: any) => !allScoutsWithDetails.some((rs: any) => rs.entityId === s.id))
                                .map((s: any) => (
                                    <RegisterLinkedScoutButton
                                        key={s.id}
                                        campoutId={campout.id}
                                        scoutId={s.id}
                                        scoutName={s.name}
                                        slug={slug}
                                        className="w-full"
                                    />
                                ))
                            }

                            {(() => {
                                const isSelfRegistered = role === 'SCOUT'
                                    ? allScoutsWithDetails.some((rs: any) => rs.entityId === currentUserScout?.id)
                                    : isParticipatingAdult;
                                const areAllLinkedRegistered = allLinkedScouts.every((s: any) => allScoutsWithDetails.some((rs: any) => rs.entityId === s.id));

                                if (isSelfRegistered && areAllLinkedRegistered && (isParticipatingAdult || role === 'SCOUT' || allLinkedScouts.length > 0)) {
                                    return <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mt-2">Registration Complete</p>
                                }
                                return null;
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Report Full Width */}
            {canViewFinancesFull && (
                <Card className="mt-8 border-2 shadow-sm overflow-hidden">
                    <CardHeader className="bg-gray-50/50 dark:bg-muted/10 border-b">
                        <CardTitle className="text-xl font-bold">Comprehensive Financial Report</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <FinancialReport
                            transactions={campout.transactions.map((t: any) => ({
                                ...t,
                                amount: Number(t.amount),
                                scout: t.scout ? { ...t.scout, ibaBalance: Number(t.scout.ibaBalance) } : null
                            }))}
                            expenses={campout.expenses.map((e: any) => ({ ...e, amount: Number(e.amount) }))}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
