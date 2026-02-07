import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { formatCurrency, cn } from "@/lib/utils"
import { MapPin, CalendarDays, Wallet, RefreshCw } from "lucide-react"
import { CampoutRoster } from "@/components/campouts/campout-roster"
import { TransactionTable } from "@/components/transactions/transaction-table"
import { CampoutAdults } from "@/components/campouts/campout-adults"
import { ReimbursementRecorder } from "@/components/campouts/reimbursement-recorder"
import { ExpenseLogger } from "@/components/campouts/expense-logger"
import { PendingReimbursements } from "@/components/campouts/pending-reimbursements"
import { IBAPayment } from "@/components/campouts/iba-payment"
import { PaymentRecorder } from "@/components/campouts/payment-recorder"
import { FinancialReport } from "@/components/campouts/financial-report"
import { RoleSwitcher } from "@/components/campouts/role-switcher"
import { RemoveParticipantButton } from "@/components/campouts/remove-participant-button"
import { FinalizeCampoutButton } from "@/components/campouts/finalize-button"
import { PayCashButton } from "@/components/campouts/pay-cash-button"
import { PayoutControls } from "@/components/campouts/payout-controls"
import { Badge } from "@/components/ui/badge"
import { CampoutLifecycleActions } from "@/components/campouts/campout-lifecycle-actions"
import { JoinCampoutButton } from "@/components/campouts/join-campout-button"
import { JoinAsAdultButton } from "@/components/campouts/join-as-adult-button"
import { RegisterLinkedScoutButton } from "@/components/campouts/register-linked-scout-button"
import { AddAttendeeDialog } from "@/components/campouts/add-attendee-dialog"
import { RefundButton } from "@/components/campouts/refund-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import { RequestPayoutButton } from "@/components/campouts/request-payout-button"

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

    if (campout?.transactions) {
        console.log("DEBUG TRANSACTIONS:", campout.transactions.map((t: any) => ({
            id: t.id,
            type: t.type,
            amount: t.amount,
            userId: t.userId,
            scoutId: t.scoutId,
            status: t.status // Explicitly log status
        })))
    }

    if (!campout) notFound()

    // Correctly fetch role from TroopMember
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: campout.troopId,
                userId: session.user.id
            }
        }
    })

    const role = membership?.role || "SCOUT"

    // Fetch Linked Scouts (for Parents/Leaders/etc who have kids)
    const parentLinks = await prisma.parentScout.findMany({
        where: { parentId: session?.user?.id },
        include: { scout: true }
    })
    const allLinkedScouts = parentLinks.map(pl => pl.scout)

    // Current User Scout Profile (if they are a Scout themselves)
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

    // Fetch Parent-Scout links for all potential adults to enable IBA payments from their children
    const allParentScouts = await prisma.parentScout.findMany({
        where: {
            parentId: { in: campout.adults.map((a: any) => a.adultId) }
        },
        include: { scout: true }
    })

    const adultToScoutsMap = new Map<string, any[]>()
    allParentScouts.forEach(ps => {
        if (!adultToScoutsMap.has(ps.parentId)) {
            adultToScoutsMap.set(ps.parentId, [])
        }
        adultToScoutsMap.get(ps.parentId)?.push(ps.scout)
    })

    // Data for Financials Table (Transactions)
    // Data for Financials Table (Transactions) - Filtered to ONLY show expenses as requested
    const expenses = campout.transactions.filter((t: any) =>
        ["EXPENSE", "REIMBURSEMENT"].includes(t.type)
    )

    // Calculate Total Cost (Direct Expenses + All Adult Expenses)
    // We exclude REIMBURSEMENT transactions from cost calc because they are covered by AdultExpenses
    // We also exclude REFUNDS from cost calc because they are subtracted from Income
    const directExpenses = campout.transactions.filter((t: any) =>
        t.type === "EXPENSE" && !t.description?.includes("Refund") && t.status === "APPROVED"
    )
    const transactionsCost = directExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const adultExpensesCost = campout.expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0)

    const totalCampoutCost = transactionsCost + adultExpensesCost

    // Group adults by ID to handle dual roles
    const adultRoleMap = new Map<string, { adult: any, roles: Set<string> }>()
    campout.adults.forEach((a: any) => {
        if (!adultRoleMap.has(a.adultId)) {
            adultRoleMap.set(a.adultId, { adult: a.adult, roles: new Set() })
        }
        adultRoleMap.get(a.adultId)!.roles.add(a.role)
    })

    // Split Adults based on their roles
    const paidLinkIds = new Set(campout.expenses.map((e: any) => e.adultId))
    const organizers = Array.from(adultRoleMap.values())
        .filter(({ roles, adult }) => roles.has("ORGANIZER") || paidLinkIds.has(adult.id))
        .map(({ adult, roles }) => ({ adult, roles: Array.from(roles), adultId: adult.id }))

    const attendees = Array.from(adultRoleMap.values())
        .filter(({ roles }) => roles.has("ATTENDEE"))
        .map(({ adult, roles }) => ({ adult, roles: Array.from(roles), adultId: adult.id }))

    const availableAdultAttendees = allAdults.filter(u =>
        !attendees.some(a => a.adultId === u.id) &&
        !organizers.some(o => o.adultId === u.id)
    )

    // Calculate Roster Counts (Scouts + Attendees)
    // Organizers are NOT included in cost splitting unless they are Attendees
    const scoutCount = campout.scouts.length
    const totalPeople = scoutCount + attendees.length
    const rawCost = totalPeople > 0 ? totalCampoutCost / totalPeople : 0
    const costPerPerson = Math.round(rawCost * 100) / 100

    // Check Payments for Attendees
    const attendeePayments = campout.transactions.filter((t: any) => t.type === "REGISTRATION_INCOME" && t.userId)
    const paidAdultMap = new Map()
    attendeePayments.forEach((t: any) => {
        const current = paidAdultMap.get(t.userId!) || 0
        paidAdultMap.set(t.userId!, current + Number(t.amount))
    })


    // Prepare data for Parent/Scout payment
    const linkedScouts = allLinkedScouts.filter(s => campout.scouts.some((cs: any) => cs.scoutId === s.id))

    if (role === 'SCOUT') {
        const scout = await prisma.scout.findUnique({ where: { userId: session?.user?.id } })
        console.log("DEBUG SCOUT VIEW:", {
            userId: session?.user?.id,
            scoutFound: !!scout,
            scoutId: scout?.id,
            isInCampout: scout && campout.scouts.some((cs: any) => cs.scoutId === scout.id)
        })
        if (scout && campout.scouts.some((cs: any) => cs.scoutId === scout.id)) {
            if (!linkedScouts.find(ls => ls.id === scout.id)) {
                linkedScouts.push(scout)
            }
        }
    }

    // Filter pending expenses
    const pendingExpenses = campout.expenses.filter((e: any) => !e.isReimbursed)
    const canApprove = ["ADMIN", "FINANCIER"].includes(role)

    // Serialization
    const serializedPendingExpenses = pendingExpenses.map((e: any) => ({
        ...e,
        amount: Number(e.amount)
    }))

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
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const organizersWithExpenses = organizers.map(org => {
        // Total expenses logged by this organizer
        const totalExpenses = campout.expenses
            .filter((e: any) => e.adultId === org.adultId)
            .reduce((sum: number, e: any) => sum + Number(e.amount), 0)

        // Total amount already reimbursed (based on transactions)
        const totalReimbursed = campout.transactions
            .filter((t: any) => t.type === 'REIMBURSEMENT' && t.userId === org.adultId)
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        // Pending amount is the difference
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

    const myData = (organizersWithExpenses as any[]).find(o => o.adultId === session?.user?.id)
    const myPendingExpense = myData?.pendingExpense || 0
    const myNetBalance = myData?.netBalance || 0
    const myTotalSpent = myData?.totalSpent || 0
    const myTotalReimbursed = myData?.totalReimbursed || 0

    const serializedLinkedScouts = linkedScouts.map(s => ({
        ...s,
        ibaBalance: Number(s.ibaBalance)
    }))

    const serializedAllLinkedScouts = allLinkedScouts.map((s: any) => ({
        ...s,
        ibaBalance: Number(s.ibaBalance)
    }))

    // Debug logging
    console.log("Calc Stats:", {
        id,
        directExp: transactionsCost,
        adultExp: adultExpensesCost,
        total: totalCampoutCost,
        people: totalPeople,
        perPerson: costPerPerson
    })

    // Calculate Total Collected (Net after refunds)
    const allRefundsTotal = campout.transactions
        .filter((t: any) => (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.description?.includes("Refund") && t.status === "APPROVED")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const grossCollected = campout.transactions
        .filter((t: any) =>
            (["CAMP_TRANSFER", "REGISTRATION_INCOME", "EVENT_PAYMENT", "TROOP_PAYMENT"].includes(t.type) || t.type.startsWith("TROOP")) &&
            t.status === "APPROVED" &&
            !t.description?.includes("Refund")
        )
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

    const totalCollected = grossCollected - allRefundsTotal
    const organizerHeldTotal = campout.transactions
        .filter((t: any) => t.type === "REIMBURSEMENT" && t.description?.includes("Cash Collection") && t.status === "APPROVED")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0)
    const bankCollectedTotal = Math.max(0, totalCollected - organizerHeldTotal)

    const cashHeldPerOrganizer = new Map<string, number>()
    campout.transactions
        .filter((t: any) => t.type === "REIMBURSEMENT" && t.description?.includes("Cash Collection") && t.status === "APPROVED")
        .forEach((t: any) => {
            const current = cashHeldPerOrganizer.get(t.userId!) || 0
            cashHeldPerOrganizer.set(t.userId!, current + Number(t.amount))
        })

    // Prepare My Scouts Payment Data
    const myScoutsData = serializedLinkedScouts.map(scout => {
        const amountPaid = campout.transactions
            .filter((t: any) =>
                (["CAMP_TRANSFER", "EVENT_PAYMENT", "REGISTRATION_INCOME"].includes(t.type) || t.type.startsWith("TROOP")) &&
                t.scoutId === scout.id &&
                !t.userId && // NOT paying for an adult
                t.status === "APPROVED" &&
                !t.description?.includes("Refund")
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const refundedAmount = campout.transactions
            .filter((t: any) =>
                (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") &&
                t.scoutId === scout.id &&
                !t.userId && // NOT an adult refund credited to this scout
                t.description?.includes("Refund") &&
                t.status === "APPROVED"
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const netPaid = amountPaid - refundedAmount
        const isPaid = netPaid >= costPerPerson && costPerPerson > 0
        const remainingDue = Math.max(0, costPerPerson - netPaid)
        const overpaidAmount = Math.max(0, netPaid - costPerPerson)

        return {
            ...scout,
            amountPaid: netPaid,
            isPaid,
            remainingDue,
            overpaidAmount
        }
    })



    // Check Current User Status
    // A user might have multiple entries (e.g. Organizer AND Attendee), so we check all matches.
    const myAdultRecords = campout.adults.filter((a: any) => a.adultId === session?.user?.id)
    const hasExpense = campout.expenses.some((e: any) => e.adultId === session?.user?.id)
    const isOrganizer = myAdultRecords.some((a: any) => a.role === "ORGANIZER") || hasExpense
    // Consider them a participant if they have any record in the campout
    const isParticipatingAdult = myAdultRecords.length > 0

    // Check if they are listed specifically as an attendee for payment purposes
    const isAttendee = attendees.some((a: any) => a.adult.id === session?.user?.id)

    let myAdultPaymentData = null
    if (isAttendee) {
        const amountPaid = campout.transactions
            .filter((t: any) =>
                ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT", "TROOP_PAYMENT"].includes(t.type) &&
                t.userId === session?.user?.id &&
                t.status === "APPROVED" &&
                !t.description?.includes("Refund")
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const refundedAmount = campout.transactions
            .filter((t: any) =>
                (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") &&
                t.userId === session?.user?.id &&
                t.description?.includes("Refund") &&
                t.status === "APPROVED"
            )
            .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

        const netPaid = amountPaid - refundedAmount
        const isPaid = netPaid >= costPerPerson
        const remainingDue = Math.max(0, costPerPerson - netPaid)
        const overpaidAmount = Math.max(0, netPaid - costPerPerson)
        myAdultPaymentData = { amountPaid: netPaid, isPaid, remainingDue, overpaidAmount }
    }

    // Identify Orphaned Payments (Former Participants)
    const orphanedPayments = (() => {
        const currentScoutIds = new Set(campout.scouts.map((cs: any) => cs.scoutId))
        const currentAdultIds = new Set(campout.adults.map((ca: any) => ca.adultId))
        const map = new Map()
        const incomingTypes = ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT", "TROOP_PAYMENT"]

        campout.transactions.forEach((t: any) => {
            if (t.status !== "APPROVED") return
            const isIncome = (incomingTypes.includes(t.type) || t.type.startsWith("TROOP")) && !t.description?.includes("Refund")
            const isRefund = (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.description?.includes("Refund")

            if (isIncome) {
                if (t.userId) { // Adult priority
                    if (!currentAdultIds.has(t.userId)) {
                        const key = `ADULT:${t.userId}`
                        const cur = map.get(key) || { amount: 0, type: 'ADULT', id: t.userId, name: t.user?.name || 'Former attendee' }
                        cur.amount += Number(t.amount)
                        map.set(key, cur)
                    }
                } else if (t.scoutId) { // Scout 
                    if (!currentScoutIds.has(t.scoutId)) {
                        const key = `SCOUT:${t.scoutId}`
                        const cur = map.get(key) || { amount: 0, type: 'SCOUT', id: t.scoutId, name: t.scout?.name || 'Former Scout' }
                        cur.amount += Number(t.amount)
                        map.set(key, cur)
                    }
                }
            } else if (isRefund) {
                const key = t.userId ? `ADULT:${t.userId}` : t.scoutId ? `SCOUT:${t.scoutId}` : null
                if (key && map.has(key)) {
                    const cur = map.get(key)
                    cur.amount -= Number(t.amount)
                    if (cur.amount <= 0.01) map.delete(key)
                }
            }
        })
        return Array.from(map.values())
    })()

    const isClosed = campout.status === "CLOSED"
    const canViewFinances = ["ADMIN", "FINANCIER"].includes(role) || isOrganizer
    const canViewRoster = ["ADMIN", "FINANCIER", "LEADER"].includes(role) || isOrganizer

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* ... Header ... */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{campout.name}</h1>
                    <div className="flex items-center gap-4 text-muted-foreground mt-2">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {campout.location}</span>
                        <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4" /> {new Date(campout.startDate).toLocaleDateString()} - {campout.endDate ? new Date(campout.endDate).toLocaleDateString() : 'TBD'}</span>
                        <Badge variant={
                            campout.status === 'OPEN' ? 'default' :
                                campout.status === 'READY_FOR_PAYMENT' ? 'secondary' : 'outline'
                        }>
                            {campout.status.replace(/_/g, " ")}
                        </Badge>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold">{campout.estimatedCost ? formatCurrency(Number(campout.estimatedCost)) : 'N/A'}</div>
                    <div className="text-xs text-gray-400">Est. Total Cost</div>

                    {totalPeople > 0 && (
                        <div className="mt-2 text-sm">
                            <span className="font-semibold text-gray-700">Share per Person:</span>
                            <div className="text-xl font-bold text-primary">{formatCurrency(costPerPerson)}</div>
                            <div className="text-xs text-gray-500 mt-1">
                                Collected: <span className="text-green-600 font-bold">{formatCurrency(totalCollected)}</span>
                                {organizerHeldTotal > 0 && (
                                    <span className="block text-[10px] text-muted-foreground italic">
                                        ({formatCurrency(bankCollectedTotal)} Bank + {formatCurrency(organizerHeldTotal)} Organizers)
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Admin Actions */}
                    {["ADMIN", "FINANCIER"].includes(role) && (
                        <div className="mt-2">
                            {(campout.status === 'DRAFT' || campout.status === 'OPEN') ? (
                                <CampoutLifecycleActions
                                    campoutId={campout.id}
                                    slug={(await params).slug}
                                    status={campout.status}
                                    campoutName={campout.name}
                                />
                            ) : (
                                <PayoutControls
                                    campoutId={campout.id}
                                    slug={(await params).slug}
                                    status={campout.status}
                                    organizers={organizersWithExpenses}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Parent/Scout Action Section */}
            {(myScoutsData.length > 0 || myAdultPaymentData || isOrganizer) ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* My Participation (Adult) */}
                    {(myAdultPaymentData || isOrganizer) && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/50 rounded-lg p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-lg">My Participation</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {isOrganizer ? "Organizer" : ""} {isAttendee ? (isOrganizer ? "& Attendee" : "Attendee") : ""}
                                    </p>
                                </div>
                                {myAdultPaymentData?.isPaid && (
                                    <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-[10px] font-bold">PAID</span>
                                )}
                            </div>

                            {isOrganizer && (
                                <div className="border-t border-indigo-100 dark:border-indigo-800/50 pt-2 space-y-1">
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">Total Spent:</span>
                                        <span>{formatCurrency(myTotalSpent)}</span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-gray-500">Collected/Reimbursed:</span>
                                        <span className="text-green-600">-{formatCurrency(myTotalReimbursed)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-indigo-100 dark:border-indigo-800/20">
                                        <span>{myNetBalance >= 0 ? "Reimbursement Due:" : "Cash Held (Owe Troop):"}</span>
                                        <span className={myNetBalance >= 0 ? "text-amber-600" : "text-red-600"}>
                                            {formatCurrency(Math.abs(myNetBalance))}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!isOrganizer && isAttendee && (
                                <div className="pt-2">
                                    <div className="text-xs text-gray-500">
                                        {myAdultPaymentData?.overpaidAmount! > 0 ? "Refund Due" : "Amount Due"}
                                    </div>
                                    <div className={cn("font-bold text-lg", myAdultPaymentData?.overpaidAmount! > 0 ? "text-amber-600" : "text-gray-900 dark:text-gray-100")}>
                                        {formatCurrency(myAdultPaymentData?.overpaidAmount! > 0 ? myAdultPaymentData?.overpaidAmount! : myAdultPaymentData?.remainingDue!)}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-3 flex flex-col gap-2">
                                {isClosed ? (
                                    isOrganizer && (myPendingExpense > 0 || (myAdultPaymentData?.overpaidAmount || 0) > 0) && (
                                        <RequestPayoutButton
                                            campoutId={campout.id}
                                            slug={slug}
                                            amount={myPendingExpense > 0 ? myPendingExpense : (myAdultPaymentData?.overpaidAmount || 0)}
                                            label="Request Reimbursement"
                                        />
                                    )
                                ) : (
                                    !myAdultPaymentData?.isPaid && campout.status === 'READY_FOR_PAYMENT' && (
                                        <div className="flex flex-col gap-2">
                                            {(() => {
                                                const hasFunds = serializedAllLinkedScouts.some((s: any) => Number(s.ibaBalance) >= costPerPerson)
                                                const isDisabled = serializedAllLinkedScouts.length === 0 || !hasFunds
                                                return (
                                                    <IBAPayment
                                                        campoutId={campout.id}
                                                        linkedScouts={serializedAllLinkedScouts}
                                                        defaultAmount={costPerPerson}
                                                        beneficiaryId={session?.user?.id}
                                                        disabled={isDisabled}
                                                        label="Pay IBA"
                                                        className="w-full h-8"
                                                    />
                                                )
                                            })()}
                                            <PayCashButton message={`Please pay ${formatCurrency(costPerPerson)} cash to the organizer.`} />
                                        </div>
                                    )
                                )}

                                {!isClosed && !myAdultPaymentData?.isPaid && campout.status !== 'READY_FOR_PAYMENT' && (
                                    <span className="text-xs text-gray-500 italic text-center">Waiting for finalization</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* My Scouts */}
                    {myScoutsData.map(scout => (
                        <div key={scout.id} className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg">{scout.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">IBA Balance: {formatCurrency(scout.ibaBalance)}</p>
                                </div>
                                {campout.status === 'OPEN' && (
                                    <RemoveParticipantButton campoutId={campout.id} id={scout.id} type="SCOUT" />
                                )}
                            </div>

                            <div className="flex items-center justify-between mt-auto">
                                <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {scout.overpaidAmount > 0 ? "Refund Due" : "Amount Due"}
                                    </div>
                                    <div className={cn("font-bold", scout.overpaidAmount > 0 ? "text-amber-600" : "text-gray-900 dark:text-gray-100")}>
                                        {formatCurrency(scout.overpaidAmount > 0 ? scout.overpaidAmount : scout.remainingDue)}
                                    </div>
                                </div>

                                {scout.overpaidAmount > 0 && ["ADMIN", "FINANCIER", "LEADER"].includes(role) && (
                                    <RefundButton
                                        campoutId={campout.id}
                                        entityId={scout.id}
                                        entityType="SCOUT"
                                        refundAmount={scout.overpaidAmount}
                                        entityName={scout.name}
                                        hasIbaAccount={true}
                                    />
                                )}

                                {scout.isPaid ? (
                                    <span className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                                        PAID
                                    </span>
                                ) : (
                                    <>
                                        {campout.status === 'READY_FOR_PAYMENT' && !isClosed ? (
                                            <div className="flex flex-col gap-2 w-full sm:w-auto min-w-[140px]">
                                                <IBAPayment
                                                    campoutId={campout.id}
                                                    linkedScouts={[scout]} // Pass only this scout
                                                    defaultAmount={scout.remainingDue}
                                                    disabled={Number(scout.ibaBalance) <= 0}
                                                    label="Pay IBA"
                                                />
                                                <PayCashButton message={`Please pay ${formatCurrency(scout.remainingDue)} cash to the organizer.`} />

                                                {["ADMIN", "FINANCIER", "LEADER"].includes(role) && (
                                                    <PaymentRecorder
                                                        campoutId={campout.id}
                                                        scoutId={scout.id}
                                                        adultName={scout.name}
                                                        defaultAmount={scout.remainingDue}
                                                        label="Record Pay"
                                                        className="w-full"
                                                        variant="outline"
                                                        organizers={organizersWithExpenses}
                                                    />
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-500 italic">
                                                {isClosed ? "Campout Closed" : "Waiting for finalization"}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* My Pending Registration (New Card) */}
                    {campout.status === 'OPEN' && !isClosed && (
                        (allLinkedScouts.some(s => !linkedScouts.some(ls => ls.id === s.id)) || (role !== 'SCOUT' && !isAttendee))
                    ) && (
                            <div className="bg-muted/50 dark:bg-muted/10 border border-dashed rounded-lg p-4 flex flex-col gap-3 justify-center items-center text-center h-full min-h-[160px]">
                                <div>
                                    <h3 className="font-semibold text-lg">Register More</h3>
                                    <p className="text-sm text-gray-500">Add yourself or other scouts</p>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {/* Register Adult Self */}
                                    {role !== 'SCOUT' && !isAttendee && (
                                        <JoinAsAdultButton campoutId={campout.id} slug={slug} />
                                    )}

                                    {/* Register Unregistered Linked Scouts */}
                                    {allLinkedScouts
                                        .filter(s => !linkedScouts.some(ls => ls.id === s.id))
                                        .map(s => (
                                            <RegisterLinkedScoutButton
                                                key={s.id}
                                                campoutId={campout.id}
                                                scoutId={s.id}
                                                scoutName={s.name}
                                                slug={slug}
                                            />
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                </div>
            ) : (
                <div className="p-8 bg-muted/50 dark:bg-muted/10 border rounded-lg text-center space-y-4">
                    <h3 className="text-lg font-semibold text-muted-foreground">Not Registered</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {role === 'SCOUT'
                            ? "You are not currently listed on the roster for this campout."
                            : "No scouts linked to your account are on the roster for this campout."}
                    </p>

                    {campout.status === 'OPEN' && !isClosed && (
                        <div className="flex flex-col items-center gap-3 pt-4">
                            {/* Adult Join */}
                            {role !== 'SCOUT' && !isAttendee && (
                                <JoinAsAdultButton campoutId={campout.id} slug={slug} />
                            )}

                            {/* Scout Self-Join */}
                            {role === 'SCOUT' && currentUserScout && !linkedScouts.some(ls => ls.id === currentUserScout.id) && (
                                <JoinCampoutButton campoutId={campout.id} scoutId={currentUserScout.id} />
                            )}

                            {/* Linked Scouts Join */}
                            {allLinkedScouts
                                .filter(s => !linkedScouts.some(ls => ls.id === s.id))
                                .map(s => (
                                    <RegisterLinkedScoutButton
                                        key={s.id}
                                        campoutId={campout.id}
                                        scoutId={s.id}
                                        scoutName={s.name}
                                        slug={slug}
                                    />
                                ))
                            }
                        </div>
                    )}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2">
                {/* ... Financials Column ... */}
                {canViewFinances && (
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle className="text-xl font-bold">Financials</CardTitle>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
                                    <span className="text-muted-foreground">Exp: {formatCurrency(totalCampoutCost)}</span>
                                    <span className="text-green-600">Col: {formatCurrency(totalCollected)}</span>
                                    <span className={totalCollected - totalCampoutCost >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                        Net: {formatCurrency(totalCollected - totalCampoutCost)}
                                    </span>
                                </div>
                            </div>
                            {!isClosed && campout.status === 'OPEN' && (
                                <ExpenseLogger
                                    campoutId={campout.id}
                                    adults={campout.adults}
                                    allAdults={allAdults}
                                    currentUserId={session?.user?.id}
                                    userRole={role}
                                    isOrganizer={campout.adults.some((a: any) => a.role === 'ORGANIZER' && a.adultId === session?.user?.id)}
                                />
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {canApprove && serializedPendingExpenses.length > 0 && (
                                <PendingReimbursements
                                    expenses={serializedPendingExpenses}
                                    isReadOnly={campout.status !== 'OPEN'}
                                />
                            )}

                            {serializedExpenses.length > 0 ? (
                                <TransactionTable
                                    transactions={serializedExpenses}
                                    isReadOnly={campout.status !== 'OPEN'}
                                />
                            ) : (
                                <p className="text-muted-foreground text-sm">No expenses recorded.</p>
                            )}

                            {/* Organizer Holdings Section */}
                            {canViewFinances && organizerHeldTotal > 0 && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Cash Held by Organizers
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Array.from(cashHeldPerOrganizer.entries()).map(([uId, amt]) => (
                                            <div key={uId} className="flex justify-between items-center p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                                                <span className="text-xs font-medium">
                                                    {organizers.find(o => o.adultId === uId)?.adult.name || "Organizer"}
                                                </span>
                                                <span className="text-xs text-amber-600 font-bold">{formatCurrency(amt)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                                        This cash has been credited toward their reimbursement.
                                    </p>
                                </div>
                            )}

                            {/* Orphaned Payments Section */}
                            {canViewFinances && orphanedPayments.length > 0 && (
                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-semibold mb-3 text-amber-600 flex items-center gap-2">
                                        <RefreshCw className="w-4 h-4" />
                                        Orphaned Payments (Former Participants)
                                    </h4>
                                    <div className="space-y-2">
                                        {orphanedPayments.map((p: any) => (
                                            <div key={`${p.type}-${p.id}`} className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                                <div className="text-sm">
                                                    <div className="font-medium">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">Paid: {formatCurrency(p.amount)}</div>
                                                </div>
                                                <RefundButton
                                                    campoutId={campout.id}
                                                    entityId={p.id}
                                                    entityType={p.type as any}
                                                    refundAmount={p.amount}
                                                    entityName={p.name}
                                                    hasIbaAccount={p.type === 'SCOUT'}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-2 italic">
                                        These people have paid for the campout but are no longer on the roster. Please refund them to clear the balances.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
                {/* ... Roster Column ... */}
                {canViewRoster && (
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <CampoutRoster
                                    campoutId={campout.id}
                                    registeredScouts={campout.scouts.map((cs: any) => {
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
                                        const remainingDue = Math.max(0, costPerPerson - netPaid)
                                        const overpaidAmount = Math.max(0, netPaid - costPerPerson)
                                        return {
                                            ...cs,
                                            scout: { ...cs.scout, ibaBalance: Number(cs.scout.ibaBalance) },
                                            isPaid,
                                            remainingDue,
                                            overpaidAmount: Math.max(0, netPaid - costPerPerson)
                                        }
                                    })}
                                    allScouts={allScouts.map(s => ({ ...s, ibaBalance: Number(s.ibaBalance) }))}
                                    canEdit={["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed}
                                    costPerPerson={costPerPerson}
                                    campoutStatus={campout.status}
                                    slug={slug}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-lg font-bold">Adults</CardTitle>
                                {!isClosed && campout.status === 'OPEN' && (
                                    <CampoutAdults
                                        campoutId={campout.id}
                                        adults={campout.adults}
                                        allAdults={allAdults}
                                    />
                                )}
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Organizers</h4>
                                    <ul className="space-y-2">
                                        {organizers.map(o => {
                                            const canEdit = ["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed
                                            const canRecordPayout = ["ADMIN", "FINANCIER"].includes(role)
                                            const organizerData = (organizersWithExpenses as any[]).find(oe => oe.adultId === o.adult.id)
                                            const balanceDue = organizerData?.netBalance || 0

                                            return (
                                                <li key={o.adult.id} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border">
                                                    <div>
                                                        <div className="font-medium text-sm">{o.adult.name}</div>
                                                        {balanceDue > 0 && (
                                                            <div className="text-[10px] text-amber-600 font-bold">
                                                                Due: {formatCurrency(balanceDue)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {canRecordPayout && balanceDue > 0 && (
                                                            <ReimbursementRecorder
                                                                campoutId={campout.id}
                                                                slug={slug}
                                                                recipientId={o.adult.id}
                                                                recipientName={o.adult.name}
                                                                defaultAmount={balanceDue}
                                                            />
                                                        )}
                                                        {canEdit && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                                                            <RemoveParticipantButton campoutId={campout.id} id={o.adult.id} type="ADULT" />
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                        {organizers.length === 0 && <li className="text-muted-foreground text-sm italic py-2">No organizers listed.</li>}
                                    </ul>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-sm font-semibold text-muted-foreground">Attendees ({attendees.length})</h4>
                                        {canViewRoster && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                                            <AddAttendeeDialog campoutId={campout.id} slug={slug} availableAdults={availableAdultAttendees.map(a => ({ id: a.id, name: a.name || a.email || "Unknown" }))} />
                                        )}
                                    </div>
                                    <ul className="space-y-2">
                                        {attendees.map((a: any) => {
                                            const likedScouts = adultToScoutsMap.get(a.adult.id) || []
                                            const serializedLikedScouts = likedScouts.map((s: any) => ({ ...s, ibaBalance: Number(s.ibaBalance) }))

                                            const paidGross = campout.transactions
                                                .filter((t: any) => t.userId === a.adultId && ["REGISTRATION_INCOME", "CAMP_TRANSFER", "EVENT_PAYMENT", "TROOP_PAYMENT"].includes(t.type) && t.status === "APPROVED" && !t.description?.includes("Refund"))
                                                .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

                                            const refundedAmount = campout.transactions
                                                .filter((t: any) => (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.userId === a.adultId && t.description?.includes("Refund") && t.status === "APPROVED")
                                                .reduce((sum: number, t: any) => sum + Number(t.amount), 0)

                                            const netPaid = paidGross - refundedAmount
                                            const remainingDue = Math.max(0, costPerPerson - netPaid)
                                            const overpaidAmount = Math.max(0, netPaid - costPerPerson)
                                            const isPaid = netPaid >= costPerPerson
                                            const isMe = a.adultId === session?.user?.id

                                            const canEdit = ["ADMIN", "LEADER", "FINANCIER"].includes(role) && !isClosed
                                            return (
                                                <li key={a.adult.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-muted rounded text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span>{a.adult.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {overpaidAmount > 0 ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-amber-600 font-semibold">Refund Due: {formatCurrency(overpaidAmount)}</span>
                                                                {canEdit && (
                                                                    <RefundButton
                                                                        campoutId={campout.id}
                                                                        entityId={a.adult.id}
                                                                        entityType="ADULT"
                                                                        refundAmount={overpaidAmount}
                                                                        entityName={a.adult.name}
                                                                        linkedScouts={serializedLikedScouts}
                                                                    />
                                                                )}
                                                            </div>
                                                        ) : isPaid ? (
                                                            <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs font-bold">PAID</span>
                                                        ) : (
                                                            <span className="text-xs text-red-500 font-semibold">{formatCurrency(remainingDue)} Due</span>
                                                        )}

                                                        {canEdit && (campout.status === 'OPEN' || campout.status === 'READY_FOR_PAYMENT') && (
                                                            <RemoveParticipantButton campoutId={campout.id} id={a.adult.id} type="ADULT" />
                                                        )}

                                                        {!isPaid && overpaidAmount <= 0 && (
                                                            <>
                                                                {/* Admin Record Payment (For Others) */}
                                                                {!isMe && !isClosed && (role === "ADMIN" || role === "FINANCIER" || role === "LEADER") && campout.status !== 'OPEN' && (
                                                                    <div className="flex items-center gap-2">
                                                                        {(() => {
                                                                            if (serializedLikedScouts.length === 0) return null
                                                                            return (
                                                                                <IBAPayment
                                                                                    campoutId={campout.id}
                                                                                    linkedScouts={serializedLikedScouts}
                                                                                    defaultAmount={remainingDue}
                                                                                    beneficiaryId={a.adult.id}
                                                                                    label="Pay IBA"
                                                                                    className="w-auto h-6 px-2 text-xs"
                                                                                />
                                                                            )
                                                                        })()}
                                                                        <PaymentRecorder
                                                                            campoutId={campout.id}
                                                                            adultId={a.adult.id}
                                                                            defaultAmount={remainingDue}
                                                                            label="Record Pay"
                                                                            className="w-auto h-6 px-2 text-xs"
                                                                            variant="outline"
                                                                            organizers={organizersWithExpenses}
                                                                        />
                                                                    </div>
                                                                )}

                                                                {/* Self Pay with IBA or Cash */}
                                                                {isMe && campout.status === 'READY_FOR_PAYMENT' && !isClosed && (
                                                                    <div className="flex items-center gap-2">
                                                                        {(() => {
                                                                            const hasFunds = serializedLikedScouts.some((s: any) => Number(s.ibaBalance) >= costPerPerson)
                                                                            const isDisabled = serializedLikedScouts.length === 0 || !hasFunds
                                                                            return (
                                                                                <IBAPayment
                                                                                    campoutId={campout.id}
                                                                                    linkedScouts={serializedLikedScouts}
                                                                                    defaultAmount={costPerPerson}
                                                                                    beneficiaryId={a.adult.id}
                                                                                    disabled={isDisabled}
                                                                                    label="Pay IBA"
                                                                                    className="w-auto h-6 px-2 text-xs"
                                                                                />
                                                                            )
                                                                        })()}

                                                                        {(role === "ADMIN" || role === "FINANCIER" || role === "LEADER") ? (
                                                                            <PaymentRecorder
                                                                                campoutId={campout.id}
                                                                                adultId={a.adult.id}
                                                                                defaultAmount={remainingDue}
                                                                                label="Record Pay"
                                                                                variant="outline"
                                                                                className="w-auto h-6 px-2 text-xs"
                                                                                organizers={organizersWithExpenses}
                                                                            />
                                                                        ) : (
                                                                            <PayCashButton message={`Please pay ${formatCurrency(remainingDue)} cash to the organizer.`} />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                        {attendees.length === 0 && <li className="text-muted-foreground text-sm italic py-2">No adult attendees.</li>}
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            {/* Financial Report (Admin/Organizer Only) - Full Width at Bottom */}
            {
                canViewFinances && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold">Financial Report</CardTitle>
                        </CardHeader>
                        <CardContent>
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
                )
            }
        </div >
    )
}
