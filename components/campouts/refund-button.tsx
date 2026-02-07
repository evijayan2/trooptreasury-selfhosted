"use client"

import { useState } from "react"
import { processRefund } from "@/app/actions"
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
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

interface RefundButtonProps {
    campoutId: string
    entityId: string
    entityType: "SCOUT" | "ADULT"
    refundAmount: number
    entityName: string
    hasIbaAccount?: boolean
    linkedScouts?: { id: string, name: string }[]
}

export function RefundButton({ campoutId, entityId, entityType, refundAmount, entityName, hasIbaAccount = false, linkedScouts = [] }: RefundButtonProps) {
    const [open, setOpen] = useState(false)
    const [method, setMethod] = useState<"IBA_CREDIT" | "CASH">(
        (hasIbaAccount && entityType === "SCOUT") || (entityType === "ADULT" && linkedScouts.length > 0) ? "IBA_CREDIT" : "CASH"
    )
    const [targetScoutId, setTargetScoutId] = useState<string>(
        entityType === "SCOUT" ? entityId : (linkedScouts[0]?.id || "")
    )
    const [isPending, setIsPending] = useState(false)
    const router = useRouter()

    const handleRefund = async () => {
        setIsPending(true)
        try {
            const result = await processRefund(
                campoutId,
                entityId,
                entityType,
                refundAmount.toString(),
                method,
                method === "IBA_CREDIT" ? targetScoutId : undefined
            )
            if (result.success) {
                toast.success("Refund processed successfully")
                setOpen(false)
                router.refresh()
            } else {
                toast.error(result.error)
            }
        } catch (error) {
            toast.error("An unexpected error occurred")
        } finally {
            setIsPending(false)
        }
    }

    const canDoIba = (entityType === "SCOUT" && hasIbaAccount) || (entityType === "ADULT" && linkedScouts.length > 0)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs text-amber-600 border-amber-200 hover:bg-amber-50">
                    <RefreshCw className="w-3 h-3 mr-1" /> Refund
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Process Refund</DialogTitle>
                    <DialogDescription>
                        Refund overpayment of <strong>{formatCurrency(refundAmount)}</strong> to {entityName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Refund Method</Label>
                        <Select value={method} onValueChange={(v) => setMethod(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                {canDoIba && (
                                    <SelectItem value="IBA_CREDIT">Credit {entityType === 'ADULT' ? "a Scout's" : ""} IBA Account</SelectItem>
                                )}
                                <SelectItem value="CASH">Cash / External Refund</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground pt-1">
                            {method === "IBA_CREDIT"
                                ? `Funds will be added back to the ${entityType === 'ADULT' ? 'selected Scout\'s' : 'Scout\'s'} IBA balance.`
                                : "Log that you have manually returned the money (Cash/Venmo/etc)."}
                        </p>
                    </div>

                    {method === "IBA_CREDIT" && entityType === "ADULT" && linkedScouts.length > 0 && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                            <Label>Select Scout to Credit</Label>
                            <Select value={targetScoutId} onValueChange={setTargetScoutId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a scout" />
                                </SelectTrigger>
                                <SelectContent>
                                    {linkedScouts.map(s => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleRefund} disabled={isPending || (method === "IBA_CREDIT" && entityType === "ADULT" && !targetScoutId)}>
                        {isPending ? "Processing..." : "Confirm Refund"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
