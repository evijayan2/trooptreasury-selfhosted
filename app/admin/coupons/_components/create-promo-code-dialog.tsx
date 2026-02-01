"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"
import { createPromotionCode } from "@/app/actions/admin"
import { toast } from "sonner"
import type Stripe from "stripe"

export function CreatePromoCodeDialog({ coupons }: { coupons: Stripe.Coupon[] }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const couponId = formData.get('couponId') as string
        const code = formData.get('code') as string
        const max_redemptions = formData.get('max_redemptions') ? Number(formData.get('max_redemptions')) : undefined
        const expires_at_days = formData.get('expires_at_days') ? Number(formData.get('expires_at_days')) : undefined

        try {
            await createPromotionCode({
                couponId,
                code: code || undefined, // empty string to undefined
                max_redemptions,
                expires_at: expires_at_days ? Math.floor((Date.now() + (expires_at_days * 24 * 60 * 60 * 1000)) / 1000) : undefined
            })
            toast.success("Promotion code created")
            setOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Promo Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Promotion Code</DialogTitle>
                        <DialogDescription>
                            Create a code that customers can use, linked to an existing coupon.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="couponId">Linked Coupon</Label>
                            <Select name="couponId" required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a coupon" />
                                </SelectTrigger>
                                <SelectContent>
                                    {coupons.map(coupon => (
                                        <SelectItem key={coupon.id} value={coupon.id}>
                                            {coupon.name} ({coupon.percent_off ? `${coupon.percent_off}% off` : `$${coupon.amount_off! / 100} off`})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="code">Customer Facing Code (optional)</Label>
                            <Input id="code" name="code" placeholder="e.g. SAVE20 (auto-generated if empty)" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="max_redemptions">Usage Limit</Label>
                                <Input id="max_redemptions" name="max_redemptions" type="number" placeholder="Optional" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="expires_at_days">Expire in (Days)</Label>
                                <Input id="expires_at_days" name="expires_at_days" type="number" placeholder="Optional" />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Promo Code"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
