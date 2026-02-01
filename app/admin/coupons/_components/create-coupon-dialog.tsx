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
import { createCoupon } from "@/app/actions/admin"
import { toast } from "sonner"

export function CreateCouponDialog() {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData(e.currentTarget)
        const name = formData.get('name') as string
        const percent_off = formData.get('percent_off') ? Number(formData.get('percent_off')) : undefined
        const amount_off = formData.get('amount_off') ? Number(formData.get('amount_off')) : undefined
        const duration_in_months = formData.get('duration_in_months') ? Number(formData.get('duration_in_months')) : undefined

        try {
            if (!percent_off && !amount_off) throw new Error("Please specify either percentage or fixed amount off")

            await createCoupon({
                name,
                percent_off,
                amount_off,
                duration,
                duration_in_months
            })
            toast.success("Coupon created successfully")
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
                <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    New Coupon
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Create Coupon</DialogTitle>
                        <DialogDescription>
                            Define a discount that can be used for new subscriptions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Coupon Name (internal)</Label>
                            <Input id="name" name="name" placeholder="e.g. Winter Sale 2025" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="percent_off">Percentage Off (%)</Label>
                                <Input id="percent_off" name="percent_off" type="number" min="1" max="100" placeholder="20" />
                            </div>
                            <div className="grid gap-2 text-center flex items-center justify-center pt-6 text-muted-foreground italic text-xs">
                                — OR —
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="amount_off">Fixed Amount Off ($)</Label>
                            <Input id="amount_off" name="amount_off" type="number" step="0.01" placeholder="10.00" />
                        </div>

                        <div className="grid gap-2">
                            <Label>Duration</Label>
                            <Select value={duration} onValueChange={(v: any) => setDuration(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="once">Once (first invoice)</SelectItem>
                                    <SelectItem value="repeating">Repeating (multiple months)</SelectItem>
                                    <SelectItem value="forever">Forever (lifetime of sub)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {duration === 'repeating' && (
                            <div className="grid gap-2">
                                <Label htmlFor="duration_in_months">Number of Months</Label>
                                <Input id="duration_in_months" name="duration_in_months" type="number" required placeholder="3" />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Creating..." : "Create Coupon"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
