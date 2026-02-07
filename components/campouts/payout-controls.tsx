"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { payoutOrganizers } from "@/app/actions"
import { closeCampout } from "@/app/actions/campouts"
import { toast } from "sonner"
import { Loader2, CircleDollarSign, Lock } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type PayoutAction = "payout" | "close"

interface OrganizerPayout {
    adultId: string
    adultName: string
    pendingExpense: number
}

export function PayoutControls({
    campoutId,
    status,
    slug,
    organizers = []
}: {
    campoutId: string,
    status: string,
    slug: string,
    organizers?: OrganizerPayout[]
}) {
    const [loading, setLoading] = useState<string | null>(null)
    const [confirmAction, setConfirmAction] = useState<PayoutAction | null>(null)
    const [payoutAmounts, setPayoutAmounts] = useState<Record<string, number>>({})
    const [autoPayoutOnClose, setAutoPayoutOnClose] = useState(true)

    // Initialize payout amounts when dialog opens
    const handleOpenPayout = () => {
        const initialMap: Record<string, number> = {}
        organizers.forEach(org => {
            initialMap[org.adultId] = org.pendingExpense
        })
        setPayoutAmounts(initialMap)
        setConfirmAction("payout")
    }

    const executeAction = async (action: PayoutAction) => {
        setConfirmAction(null)
        setLoading(action)
        try {
            let res: any
            if (action === "payout") {
                res = await payoutOrganizers(campoutId, payoutAmounts)
            } else if (action === "close") {
                const finalPayouts = autoPayoutOnClose ? payoutAmounts : undefined
                res = await closeCampout(campoutId, slug, finalPayouts)
            }

            if (res.success) {
                toast.success(res.message || "Action completed successfully")
            } else {
                toast.error(res.error || "An error occurred")
            }
        } catch (err: any) {
            toast.error(err.message || "Execution failed")
        } finally {
            setLoading(null)
        }
    }

    if (status === "CLOSED") {
        return (
            <div className="flex items-center gap-2 text-gray-500 font-medium">
                <Lock className="w-4 h-4" /> Campout Closed
            </div>
        )
    }

    const actionData = {

        payout: {
            title: "Payout Organizers",
            description: "Distribute collected funds to organizers. You can adjust the amounts below.",
            buttonClass: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
        },
        close: {
            title: "Close Campout",
            description: "Are you sure you want to close this campout? This will prevent further financial changes.",
            buttonClass: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
        }
    }

    const totalPending = organizers.reduce((sum, org) => sum + org.pendingExpense, 0)
    const canPayout = totalPending > 0

    return (
        <>
            <div className="flex flex-wrap gap-2">


                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOpenPayout}
                    disabled={loading !== null}
                    className={actionData.payout.buttonClass}
                >
                    {loading === "payout" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CircleDollarSign className="w-4 h-4 mr-2" />}
                    Settle Payouts
                </Button>

                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setConfirmAction("close")}
                    disabled={loading !== null}
                >
                    {loading === "close" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                    {totalPending > 0 ? "Close (with Pending Expenses)" : "Close Campout"}
                </Button>
            </div>

            <Dialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{confirmAction && actionData[confirmAction].title}</DialogTitle>
                        <DialogDescription>
                            {confirmAction === "close" && totalPending > 0
                                ? "This campout has unpaid expenses. Closing it will prevent further financial ledger changes, but you can still record reimbursements later."
                                : confirmAction ? actionData[confirmAction].description : ""}
                        </DialogDescription>
                    </DialogHeader>

                    {confirmAction === "close" && totalPending > 0 && (
                        <div className="py-4 space-y-4">
                            <div className="flex items-start space-x-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                                <input
                                    type="checkbox"
                                    id="auto-payout"
                                    className="mt-1"
                                    checked={autoPayoutOnClose}
                                    onChange={(e) => setAutoPayoutOnClose(e.target.checked)}
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="auto-payout" className="text-sm font-medium leading-none">
                                        Reimburse all organizers now
                                    </label>
                                    <p className="text-xs text-muted-foreground">
                                        This will create reimbursement transactions for total pending amount: ${totalPending.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {confirmAction === "payout" && (
                        <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto px-1">
                            {organizers.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No organizers found with pending expenses.</p>
                            ) : (
                                organizers.map(org => {
                                    // Skip organizers with 0 pending expense
                                    if (org.pendingExpense <= 0) return null

                                    return (
                                        <div key={org.adultId} className="flex items-center justify-between gap-4 border-b pb-4 last:border-0 last:pb-0">
                                            <div className="flex-1 min-w-0">
                                                <Label className="text-sm font-medium truncate block">{org.adultName}</Label>
                                                <span className="text-xs text-gray-500">Log: ${org.pendingExpense.toFixed(2)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-400">$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    max={org.pendingExpense}
                                                    className="w-24 h-8 text-right"
                                                    value={payoutAmounts[org.adultId] ?? ""}
                                                    onChange={(e) => {
                                                        let val = parseFloat(e.target.value) || 0
                                                        // Enforce max amount (cap at pendingExpense)
                                                        if (val > org.pendingExpense) val = org.pendingExpense
                                                        if (val < 0) val = 0

                                                        setPayoutAmounts(prev => ({ ...prev, [org.adultId]: val }))
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
                        <Button
                            variant={confirmAction === "close" ? "destructive" : "default"}
                            onClick={() => confirmAction && executeAction(confirmAction)}
                            disabled={confirmAction === "payout" && organizers.length === 0}
                        >
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
