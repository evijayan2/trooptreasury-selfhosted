"use client"

import { useActionState } from "react"
import { createTransaction } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { TransactionType } from "@prisma/client" // This might fail if client component imports mostly types, but enum is value. 
// Ideally we pass enum as props or redefine/map it. 
// shadcn Select doesn't iterate enum easily.

const TRANSACTION_TYPES = [
    "REGISTRATION_INCOME",
    "FUNDRAISING_INCOME",
    "DONATION_IN",
    "EXPENSE",
    "CAMP_TRANSFER",
    "REIMBURSEMENT",
    "DUES",
    "IBA_RECLAIM"
]

export function TransactionForm({ onClose, scouts = [] }: { onClose?: () => void, scouts?: any[] }) {
    const [state, dispatch, isPending] = useActionState(createTransaction, undefined)

    return (
        <form action={async (formData) => {
            await dispatch(formData)
            if (onClose) onClose()
        }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <Label htmlFor="scoutId">Scout (Optional)</Label>
                    <Select name="scoutId">
                        <SelectTrigger>
                            <SelectValue placeholder="Select scout (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            {scouts.map((scout) => (
                                <SelectItem key={scout.id} value={scout.id}>{scout.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" required>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            {TRANSACTION_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0.00" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="Details about this transaction" required />
            </div>

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
            {state?.success && <p className="text-green-500 text-sm">{state.message}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Saving..." : "Record Transaction"}
            </Button>
        </form>
    )
}
