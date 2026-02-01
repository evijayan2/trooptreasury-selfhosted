"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PowerOff } from "lucide-react"
import { deactivatePromotionCode } from "@/app/actions/admin"
import { toast } from "sonner"
import { useState } from "react"
import type Stripe from "stripe"

export function PromoCodeList({ promoCodes }: { promoCodes: (Stripe.PromotionCode & { coupon: Stripe.Coupon })[] }) {
    const [loading, setLoading] = useState<string | null>(null)

    async function handleDeactivate(id: string) {
        if (!confirm("Deactivate this code? It will no longer be usable at checkout.")) return

        setLoading(id)
        try {
            await deactivatePromotionCode(id)
            toast.success("Code deactivated")
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
                        <TableHead className="min-w-[120px]">Code</TableHead>
                        <TableHead className="min-w-[150px]">Coupon</TableHead>
                        <TableHead className="min-w-[100px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Redemptions</TableHead>
                        <TableHead className="min-w-[120px]">Expires</TableHead>
                        <TableHead className="text-right min-w-[120px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {promoCodes.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                No promotion codes found.
                            </TableCell>
                        </TableRow>
                    )}
                    {promoCodes.map((promo) => (
                        <TableRow key={promo.id}>
                            <TableCell className="font-bold font-mono text-primary whitespace-nowrap">
                                {promo.code}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                <div className="text-sm">{promo.coupon.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    {promo.coupon.percent_off ? `${promo.coupon.percent_off}% off` : `$${promo.coupon.amount_off! / 100} off`}
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge variant={promo.active ? "default" : "outline"}>
                                    {promo.active ? "Active" : "Inactive"}
                                </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {promo.times_redeemed}
                                {promo.max_redemptions ? ` / ${promo.max_redemptions}` : ''}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                                {promo.expires_at ? new Date(promo.expires_at * 1000).toLocaleDateString() : 'Never'}
                            </TableCell>
                            <TableCell className="text-right">
                                {promo.active && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeactivate(promo.id)}
                                        disabled={loading === promo.id}
                                        className="whitespace-nowrap"
                                    >
                                        <PowerOff className="h-4 w-4 mr-2" />
                                        Deactivate
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
