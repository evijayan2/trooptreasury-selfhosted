"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { recordTransaction } from "@/app/actions/finance"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { useSession } from "next-auth/react"
import { notifyWithLog } from "@/lib/notify-client"

const schema = z.object({
    amount: z.string().min(1, "Amount is required"),
    date: z.string().min(1, "Date is required"),
    description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
    campaignId: string
    scoutId: string
    scoutName: string
    slug: string
    disabled?: boolean
    onSuccess?: () => void
}

export function ScoutPaymentForm({ campaignId, scoutId, scoutName, slug, disabled, onSuccess }: Props) {
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
        }
    })

    const onSubmit = async (data: FormData) => {
        setLoading(true)
        const formData = new FormData()
        formData.append("slug", slug)
        formData.append("amount", data.amount)
        formData.append("type", "SCOUT_CASH_TURN_IN")
        formData.append("description", data.description || `Cash turn-in from ${scoutName}`)
        formData.append("date", data.date)
        formData.append("scoutId", scoutId)
        formData.append("fundraisingCampaignId", campaignId)

        const result = await recordTransaction(null, formData)

        setLoading(false)
        if (result.error) {
            toast.error(result.error)
        } else {
            notifyWithLog({
                userId: session?.user?.id || "",
                title: "Payment Recorded",
                message: "Payment recorded successfully.",
                type: "success"
            })
            setOpen(false)
            reset()
            if (onSuccess) onSuccess()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                    <Plus className="w-4 h-4 mr-2" />
                    Record Payment
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Record Record Cash Turn-in: {scoutName}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            {...register("amount")}
                            autoFocus
                        />
                        {errors.amount && <p className="text-red-500 text-xs">{errors.amount.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" type="date" {...register("date")} />
                        {errors.date && <p className="text-red-500 text-xs">{errors.date.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Notes (Optional)</Label>
                        <Input
                            id="description"
                            {...register("description")}
                            placeholder="e.g. Paid in full for popcorn sales"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Record Payment
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
