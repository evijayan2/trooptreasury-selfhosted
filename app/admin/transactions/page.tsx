
import { getTransactions } from "@/app/actions/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { RefundButton } from "./_components/refund-button"

export default async function TransactionsPage({
    searchParams
}: {
    searchParams: Promise<{ limit?: string }>
}) {
    const params = await searchParams
    const limit = Number(params.limit) || 20

    // Note: Stripe pagination uses starting_after (cursor-based), not page numbers.
    // For MVP, we'll just show the first 20-50. Full pagination requires tracking cursors in URL.
    const { data: transactions } = await getTransactions({ limit: 50 })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Transaction History</h1>
                {/* Export button could go here */}
            </div>

            <Card className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[100px]">Date</TableHead>
                                <TableHead className="min-w-[100px]">Amount</TableHead>
                                <TableHead className="min-w-[100px]">Status</TableHead>
                                <TableHead className="min-w-[150px]">Customer</TableHead>
                                <TableHead className="min-w-[150px]">Description</TableHead>
                                <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No transactions found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {transactions.map((tx: any) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {new Date(tx.created * 1000).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        ${(tx.amount / 100).toFixed(2)} {tx.currency.toUpperCase()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            tx.refunded ? 'outline' :
                                                tx.status === 'succeeded' ? 'default' :
                                                    tx.status === 'pending' ? 'secondary' :
                                                        'destructive'
                                        }>
                                            {tx.refunded ? 'refunded' : tx.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[150px] truncate">
                                        {(tx.customer as any)?.email || "N/A"}
                                    </TableCell>
                                    <TableCell className="max-w-[150px] truncate">
                                        {tx.description || "Stripe Charge"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {!tx.refunded && (
                                                <RefundButton chargeId={tx.id} isRefunded={tx.refunded} amount={tx.amount} />
                                            )}
                                            <Button variant="outline" size="sm" asChild>
                                                <Link href={`https://dashboard.stripe.com/test/payments/${tx.id}`} target="_blank">
                                                    View
                                                </Link>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
            <div className="text-xs text-muted-foreground text-center">
                Showing recent 50 transactions.
            </div>
        </div>
    )
}
