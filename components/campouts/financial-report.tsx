"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatCurrency, cn } from "@/lib/utils"

interface FinancialReportProps {
    transactions: {
        id: string
        type: string
        status: string
        amount: string | number
        description: string | null
        createdAt: Date | string
        userId?: string | null
        user?: { name: string } | null
        scout?: { name: string } | null
    }[]
    expenses: {
        id: string
        amount: string | number
        adultId: string
        adult?: { name: string } | null
    }[]
}

export function FinancialReport({ transactions, expenses }: FinancialReportProps) {
    // 1. Calculate Income (Collection)
    const ibaIncome = transactions
        .filter(t => t.type === "CAMP_TRANSFER" && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const cashIncome = transactions
        .filter(t => ["REGISTRATION_INCOME"].includes(t.type) && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const organizerCash = transactions
        .filter(t => t.type === "EVENT_PAYMENT" && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const subsidyIncome = transactions
        .filter(t => t.type.startsWith("TROOP") && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalIncomeGross = ibaIncome + cashIncome + subsidyIncome + organizerCash

    // 2. Calculate Refunds
    const totalRefunds = transactions
        .filter(t => (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.description?.includes("Refund") && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalIncome = totalIncomeGross - totalRefunds

    // 3. Calculate Expenses
    const directExpenses = transactions
        .filter(t => t.type === "EXPENSE" && !t.description?.includes("Refund") && t.status === "APPROVED")
        .reduce((sum, t) => sum + Number(t.amount), 0)

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0) + directExpenses

    // 3. Organizer Distribution (Who spent what)
    // Map adultId -> { name, spent, reimbursed }
    const organizerStats = new Map<string, { name: string, spent: number, reimbursed: number }>()

    // Process Expenses to track Spending
    expenses.forEach(e => {
        if (!e.adult) return
        const stat = organizerStats.get(e.adultId) || { name: e.adult.name, spent: 0, reimbursed: 0 }
        stat.spent += Number(e.amount)
        organizerStats.set(e.adultId, stat)
    })

    // Process Transactions to track Actual Reimbursements
    transactions
        .filter(t => t.type === "REIMBURSEMENT" && t.status === "APPROVED")
        .forEach(t => {
            if (!t.userId) return
            // Note: If an organizer has no expenses but got reimbursed (unlikely?), we create an entry
            const stat = organizerStats.get(t.userId) || { name: t.user?.name || "Unknown", spent: 0, reimbursed: 0 }
            stat.reimbursed += Number(t.amount)
            organizerStats.set(t.userId, stat)
        })

    const organizerList = Array.from(organizerStats.values())

    // 4. Detailed Payment Log
    const paymentLog = transactions
        .filter(t => {
            const isIncoming = (["CAMP_TRANSFER", "EVENT_PAYMENT", "REGISTRATION_INCOME", "TROOP_PAYMENT"].includes(t.type) || t.type.startsWith("TROOP")) && !t.description?.includes("Refund")
            const isRefund = (t.type === "EXPENSE" || t.type === "IBA_DEPOSIT") && t.description?.includes("Refund")
            return (isIncoming || isRefund) && t.status === "APPROVED"
        })
        .map(t => {
            const isRefund = t.description?.includes("Refund")
            let method = t.type === "CAMP_TRANSFER" ? "IBA Transfer" : t.type.startsWith("TROOP") ? "Troop Subsidy" : "Cash/Direct"

            if (t.type === "EVENT_PAYMENT" && t.description?.includes("Held by")) {
                const holder = t.description.split("Held by ")[1]?.replace(")", "")
                method = holder ? `Cash (Held by ${holder})` : "Cash (Org Held)"
            } else if (t.type === "REGISTRATION_INCOME" && t.description?.includes("via")) {
                const collector = t.description.split("via ")[1]?.replace(")", "")
                method = collector ? `Cash (to Bank via ${collector})` : "Cash (to Bank)"
            }

            if (isRefund) {
                method = t.type === "IBA_DEPOSIT" ? "IBA Refund" : "Cash Refund"
            }

            return {
                id: t.id,
                date: t.createdAt,
                name: t.user?.name && t.scout?.name && t.type === "CAMP_TRANSFER"
                    ? `${t.user.name} (from ${t.scout.name} IBA)`
                    : (t.scout?.name || t.user?.name || "Unknown"),
                amount: isRefund ? -Number(t.amount) : Number(t.amount),
                type: method,
                isRefund
            }
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return (
        <div className="space-y-6">


            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-col gap-1">
                            <span>IBA: {formatCurrency(ibaIncome)}</span>
                            <span>Cash (Bank): {formatCurrency(cashIncome)}</span>
                            {subsidyIncome > 0 && <span>Subsidy: {formatCurrency(subsidyIncome)}</span>}
                            {organizerCash > 0 && <span>Org. Cash: {formatCurrency(organizerCash)}</span>}
                            {totalRefunds > 0 && <span className="text-amber-600 border-t pt-1 mt-1">Refunds: -{formatCurrency(totalRefunds)}</span>}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Total Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-gray-500">Net Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-foreground' : 'text-red-600'}`}>
                            {formatCurrency(totalIncome - totalExpenses)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Organizer Distribution */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Organizer Expenses & Reimbursement</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Organizer</TableHead>
                                    <TableHead className="text-right">Spent</TableHead>
                                    <TableHead className="text-right">Reimbursed</TableHead>
                                    <TableHead className="text-right">Pending</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {organizerList.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center text-gray-500">No expenses logged.</TableCell>
                                    </TableRow>
                                ) : (
                                    organizerList.map((org, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{org.name}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(org.spent)}</TableCell>
                                            <TableCell className="text-right text-green-600">{formatCurrency(org.reimbursed)}</TableCell>
                                            <TableCell className="text-right font-bold text-red-600">
                                                {formatCurrency(org.spent - org.reimbursed)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Payment Log */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="text-base">Payment Log</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-h-[300px] overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payer</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paymentLog.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500">No payments received.</TableCell>
                                        </TableRow>
                                    ) : (
                                        paymentLog.map((p) => (
                                            <TableRow key={p.id}>
                                                <TableCell className={cn("font-medium", p.isRefund && "text-amber-600")}>{p.name}</TableCell>
                                                <TableCell className="text-xs text-gray-500">{p.type}</TableCell>
                                                <TableCell className={cn("text-right", p.isRefund && "text-amber-600 font-bold")}>
                                                    {p.amount < 0 ? `-${formatCurrency(Math.abs(p.amount))}` : formatCurrency(p.amount)}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
