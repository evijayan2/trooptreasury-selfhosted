"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { recordAdultPayment, recordScoutPayment } from "@/app/actions"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { notifyWithLog } from "@/lib/notify-client"

export function PaymentRecorder({
    campoutId,
    adultId,
    adultName = "Adult",
    defaultAmount = 0,
    label = "Record Pay",
    className = "ml-2",
    variant = "outline",
    scoutId
}: {
    campoutId: string,
    adultId?: string,
    scoutId?: string,
    adultName?: string,
    defaultAmount?: number,
    label?: string,
    className?: string,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}) {
    const router = useRouter()
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "")
    const [baseSource, setBaseSource] = useState("CASH")

    const handleRecord = async () => {
        if (!amount) return

        let finalSource = "CASH" // Default: Let server handle smart allocation

        if (baseSource === "BANK") {
            finalSource = "BANK_DIRECT"
        } else if (baseSource === "TROOP") {
            finalSource = "TROOP"
        }

        let result
        if (scoutId) {
            result = await recordScoutPayment(campoutId, scoutId, amount, finalSource)
        } else if (adultId) {
            result = await recordAdultPayment(campoutId, adultId, amount, finalSource)
        } else {
            return
        }

        if (result.success) {
            setOpen(false)
            setAmount("")
            setBaseSource("CASH")
            notifyWithLog({
                userId: session?.user?.id || "",
                title: "Payment Recorded",
                message: `Payment of $${amount} recorded for ${adultName || "User"}.`,
                type: "success"
            })
            router.refresh()
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={variant} size="sm" className={className}>
                    <DollarSign className="w-3 h-3 mr-1" /> {label}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Record Payment for {adultName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Method</Label>
                        <Select value={baseSource} onValueChange={setBaseSource}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">Cash / Check</SelectItem>
                                <SelectItem value="BANK">Bank / App</SelectItem>
                                <SelectItem value="TROOP">Troop Subsidy</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                        {baseSource === "BANK" ? (
                            "Money deposited directly to Troop Bank Account."
                        ) : baseSource === "TROOP" ? (
                            "Covered by Troop Funds (Subsidy)."
                        ) : (
                            "System will prioritize reimbursing Troop expenses first, then Organizer expenses."
                        )}
                    </div>

                    <Button onClick={handleRecord} className="w-full">
                        Record Payment
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
