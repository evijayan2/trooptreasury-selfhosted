"use client"

import { useState } from "react"
import { logCampoutExpense } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Plus } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function ExpenseLogger({
    campoutId,
    adults = [],
    allAdults = [],
    currentUserId,
    userRole,
    isOrganizer = false,
    className
}: {
    campoutId: string
    adults?: any[]
    allAdults?: any[]
    currentUserId?: string
    userRole?: string
    isOrganizer?: boolean
    className?: string
}) {
    const [open, setOpen] = useState(false)
    const [error, setError] = useState("")
    const [paidBy, setPaidBy] = useState(currentUserId || "")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError("")

        if (!paidBy) {
            setError("Please select who paid.")
            return
        }

        setLoading(true)
        const formData = new FormData(e.currentTarget)
        // Ensure paidBy is included
        formData.set("paidBy", paidBy)

        try {
            const result = await logCampoutExpense(null, formData)
            if (result.error) {
                setError(result.error)
            } else {
                setOpen(false)
                setError("")
                // Reset form manually if needed, but Dialog unmounting/remounting handles it usually
            }
        } catch (err) {
            console.error(err)
            setError("Failed to log expense")
        } finally {
            setLoading(false)
        }
    }

    const canLogForTroop = isOrganizer || ["ADMIN", "FINANCIER", "LEADER"].includes(userRole || "")

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className={className}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="sm"><Plus className="w-4 h-4 mr-2" /> Log Expense</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Add a new expense record</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Log Campout Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <input type="hidden" name="campoutId" value={campoutId} />

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" name="description" placeholder="e.g. Food, Supplies" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" placeholder="0.00" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Paid By</Label>
                        <Select value={paidBy} onValueChange={setPaidBy}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Payer" />
                            </SelectTrigger>
                            <SelectContent>
                                {currentUserId && <SelectItem value={currentUserId}>Me</SelectItem>}
                                {canLogForTroop && (
                                    <>
                                        <SelectItem value="TROOP">Troop Treasury (IBA)</SelectItem>
                                        {/* Show all adults except current user */}
                                        {allAdults
                                            .filter(a => a.id !== currentUserId)
                                            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                                            .map(a => (
                                                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                            ))
                                        }
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Logging..." : "Submit Expense"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
