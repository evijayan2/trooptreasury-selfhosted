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
    scoutId,
    organizers = []
}: {
    campoutId: string,
    adultId?: string,
    scoutId?: string,
    adultName?: string,
    defaultAmount?: number,
    label?: string,
    className?: string,
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link",
    organizers?: { adultId: string, adultName: string }[]
}) {
    const router = useRouter()
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)
    const [amount, setAmount] = useState(defaultAmount > 0 ? defaultAmount.toFixed(2) : "")
    const [baseSource, setBaseSource] = useState("CASH")
    const [collectorId, setCollectorId] = useState<string>("TROOP") // Default to Troop (Bank Deposit)

    const handleRecord = async () => {
        if (!amount) return

        let finalSource = "CASH" // Default: Let server handle smart allocation

        if (baseSource === "BANK") {
            finalSource = "BANK_DIRECT"
        } else if (baseSource === "TROOP") {
            finalSource = "TROOP"
        }

        const effectiveCollectorId = (baseSource === "CASH" && collectorId !== "TROOP") ? collectorId : undefined

        let result
        if (scoutId) {
            result = await recordScoutPayment(campoutId, scoutId, amount, finalSource, effectiveCollectorId)
        } else if (adultId) {
            result = await recordAdultPayment(campoutId, adultId, amount, finalSource, effectiveCollectorId)
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
                        <Select value={baseSource} onValueChange={(val) => {
                            setBaseSource(val)
                            if (val !== "CASH") setCollectorId("TROOP")
                        }}>
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

                    {baseSource === "CASH" && (
                        <div className="space-y-2">
                            <Label>Collected By</Label>
                            <Select value={collectorId} onValueChange={setCollectorId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="TROOP">Troop (Bank Deposit)</SelectItem>
                                    {organizers.map(org => (
                                        <SelectItem key={org.adultId} value={org.adultId}>
                                            {org.adultName} (Organizer)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="text-[10px] text-muted-foreground bg-muted p-2 rounded">
                        {baseSource === "CASH" ? (
                            collectorId === "TROOP" ? (
                                "Cash intended for Troop Bank Deposit. It will increase the Total Bank Balance immediately."
                            ) : (
                                `Cash held by ${organizers.find(o => o.adultId === collectorId)?.adultName || "Organizer"}. This will credit their personal reimbursement balance and NOT touch the bank balance.`
                            )
                        ) : baseSource === "BANK" ? (
                            "Money deposited directly to Troop Bank Account."
                        ) : (
                            "Covered by Troop Funds (Subsidy)."
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
