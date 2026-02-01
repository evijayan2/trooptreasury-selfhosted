"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { deleteCoupon } from "@/app/actions/admin"
import { toast } from "sonner"
import { useState } from "react"
import type Stripe from "stripe"

export function CouponList({ coupons }: { coupons: Stripe.Coupon[] }) {
    const [loading, setLoading] = useState<string | null>(null)

    async function handleDelete(id: string) {
        if (!confirm("Are you sure? This will prevent any new promotion codes from using this coupon.")) return

        setLoading(id)
        try {
            await deleteCoupon(id)
            toast.success("Coupon deleted")
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="min-w-[150px]">Name</TableHead>
                        <TableHead className="min-w-[100px]">Discount</TableHead>
                        <TableHead className="min-w-[120px]">Duration</TableHead>
                        <TableHead className="min-w-[100px]">Times Used</TableHead>
                        <TableHead className="text-right min-w-[80px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {coupons.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                No coupons found.
                            </TableCell>
                        </TableRow>
                    )}
                    {coupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                            <TableCell className="font-medium whitespace-nowrap">
                                {coupon.name}
                                <div className="text-xs text-muted-foreground font-mono">{coupon.id}</div>
                            </TableCell>
                            <TableCell>
                                {coupon.percent_off ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        {coupon.percent_off}% off
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                        ${(coupon.amount_off! / 100).toFixed(2)} off
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell className="capitalize whitespace-nowrap">
                                {coupon.duration}
                                {coupon.duration === 'repeating' && ` (${coupon.duration_in_months} months)`}
                            </TableCell>
                            <TableCell>{coupon.times_redeemed}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-white hover:bg-destructive"
                                    onClick={() => handleDelete(coupon.id)}
                                    disabled={loading === coupon.id}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
