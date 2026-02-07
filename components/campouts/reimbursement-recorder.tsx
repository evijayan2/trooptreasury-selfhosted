"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { recordReimbursement } from "@/app/actions/campouts"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Receipt, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

export function ReimbursementRecorder({
    campoutId,
    slug,
    recipientId,
    recipientName,
    defaultAmount = 0
}: {
    campoutId: string
    slug: string
    recipientId: string
    recipientName: string
    defaultAmount?: number
}) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "")
    const [description, setDescription] = useState(`Payout to ${recipientName}`)

    const handleRecord = async () => {
        if (!amount || Number(amount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        setLoading(true)
        try {
            const result = await recordReimbursement(
                campoutId,
                slug,
                recipientId,
                Number(amount),
                description
            )

            if (result.success) {
                toast.success(result.message)
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                    <Receipt className="w-3 h-3 mr-1" /> Record Payout
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payout to {recipientName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Amount Paid</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Current balance due: {formatCurrency(defaultAmount)}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>Description / Reference</Label>
                        <Input
                            placeholder="e.g. Paid via Venmo, Check #123"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                        Recording this payout will create a REIMBURSEMENT transaction and mark the organizer's expenses as settled.
                    </div>

                    <Button onClick={handleRecord} className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                        Confirm Payout
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
