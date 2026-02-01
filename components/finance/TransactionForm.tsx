"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useState } from "react"
import { recordTransaction } from "@/app/actions/finance"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { notifyWithLog } from "@/lib/notify-client"
import { TransactionType } from "@prisma/client"

const schema = z.object({
    amount: z.string().min(1, "Amount is required"),
    type: z.nativeEnum(TransactionType),
    description: z.string().min(1, "Description is required"),
    date: z.string().min(1, "Date is required"),
    scoutId: z.string().optional(),
    campoutId: z.string().optional(),
    budgetCategoryId: z.string().optional(),
    fundraisingCampaignId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
    triggerButton: React.ReactNode
    scouts: { id: string, name: string, ibaBalance: number }[] // Updated to require ibaBalance
    campouts: { id: string, name: string }[]
    categories: { id: string, name: string }[]
    campaigns: { id: string, name: string }[]
    slug: string
    defaultValues?: {
        type?: TransactionType
        scoutId?: string
        description?: string
        amount?: string
    }
}

export function TransactionForm({ triggerButton, scouts, campouts, categories, campaigns, slug, defaultValues }: Props) {
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)
    const [paymentMethod, setPaymentMethod] = useState("CASH")

    const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            type: defaultValues?.type || "EXPENSE",
            scoutId: defaultValues?.scoutId || undefined,
            description: defaultValues?.description || "",
            amount: defaultValues?.amount || "",
            budgetCategoryId: undefined,
            fundraisingCampaignId: undefined,
            campoutId: undefined
        }
    })

    const type = watch("type")
    const watchedScoutId = watch("scoutId")
    const watchedCategoryId = watch("budgetCategoryId")
    const watchedCampaignId = watch("fundraisingCampaignId")
    const watchedCampoutId = watch("campoutId")
    const amount = watch("amount")

    const selectedScout = scouts.find(s => s.id === watchedScoutId)
    const ibaBalance = selectedScout?.ibaBalance ? Number(selectedScout.ibaBalance) : 0

    // Reset payment method if type changes away from DUES
    // useEffect(() => { if (type !== 'DUES') setPaymentMethod("CASH") }, [type]) 
    // ^ No useEffect to avoid re-renders loop, just handle in render or submit

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("amount", data.amount)
        formData.append("type", data.type)
        formData.append("description", data.description)
        formData.append("date", data.date)
        formData.append("slug", slug) // Tenant Context

        // Add Payment Source for Dues
        if (data.type === 'DUES' && paymentMethod === 'IBA') {
            formData.append("paymentSource", "IBA")
            // Validate client side again
            if (Number(data.amount) > ibaBalance) {
                toast.error(`Insufficient IBA funds. Max: $${ibaBalance.toFixed(2)}`)
                return
            }
        } else {
            formData.append("paymentSource", "CASH")
        }

        if (data.scoutId && data.scoutId !== "none") formData.append("scoutId", data.scoutId)
        if (data.campoutId && data.campoutId !== "none") formData.append("campoutId", data.campoutId)
        if (data.budgetCategoryId && data.budgetCategoryId !== "none") formData.append("budgetCategoryId", data.budgetCategoryId)
        if (data.fundraisingCampaignId && data.fundraisingCampaignId !== "none") formData.append("fundraisingCampaignId", data.fundraisingCampaignId)

        const result = await recordTransaction(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            notifyWithLog({
                userId: session?.user?.id || "",
                title: "Transaction Recorded",
                message: "Transaction successfully recorded.",
                type: "success"
            })
            setOpen(false)
            reset() // Reset to defaults
            setPaymentMethod("CASH")
        }
    }

    // Dynamic field filtering based on type
    const showBudget = ["EXPENSE", "REGISTRATION_INCOME", "CAMP_TRANSFER", "REIMBURSEMENT"].includes(type)
    const showCampaign = ["FUNDRAISING_INCOME"].includes(type)
    const showScout = ["DUES", "FUNDRAISING_INCOME", "EVENT_PAYMENT", "IBA_RECLAIM"].includes(type)
    const showCampout = ["EVENT_PAYMENT", "EXPENSE", "REGISTRATION_INCOME", "CAMP_TRANSFER"].includes(type)

    // Show Payment Method for DUES
    const showPaymentMethod = type === "DUES" && watchedScoutId && watchedScoutId !== "none"

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Record Transaction</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="type">Type</Label>
                            <Select
                                onValueChange={(val: any) => {
                                    setValue("type", val)
                                    // Reset payment method if not dues
                                    if (val !== 'DUES') setPaymentMethod("CASH")
                                }}
                                value={type}
                                defaultValue="EXPENSE"
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="EXPENSE">Expense</SelectItem>
                                    <SelectItem value="REGISTRATION_INCOME">Income (General)</SelectItem>
                                    <SelectItem value="FUNDRAISING_INCOME">Fundraising Income</SelectItem>
                                    <SelectItem value="DONATION_IN">Donation</SelectItem>
                                    <SelectItem value="DUES">Dues Payment</SelectItem>
                                    <SelectItem value="EVENT_PAYMENT">Event Payment</SelectItem>
                                    <SelectItem value="REIMBURSEMENT">Reimbursement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="date">Date</Label>
                            <Input id="date" type="date" {...register("date")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="amount">Amount ($)</Label>
                            <Input id="amount" type="number" step="0.01" {...register("amount")} />
                            {errors.amount && <p className="text-red-500 text-sm">{errors.amount.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Input id="description" {...register("description")} placeholder="Payee or Details" />
                            {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
                        </div>
                    </div>

                    <div className="border-t pt-4 grid grid-cols-2 gap-4">
                        {/* Conditional Fields */}
                        {showBudget && (
                            <div>
                                <Label htmlFor="category">Budget Category</Label>
                                <Select
                                    onValueChange={(val) => setValue("budgetCategoryId", val)}
                                    value={watchedCategoryId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCampaign && (
                            <div>
                                <Label htmlFor="campaign">Fundraising Campaign</Label>
                                <Select
                                    onValueChange={(val) => setValue("fundraisingCampaignId", val)}
                                    value={watchedCampaignId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {campaigns.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showScout && (
                            <div>
                                <Label htmlFor="scout">Scout</Label>
                                <Select
                                    onValueChange={(val) => setValue("scoutId", val)}
                                    value={watchedScoutId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {scouts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {showCampout && (
                            <div>
                                <Label htmlFor="campout">Event/Campout</Label>
                                <Select
                                    onValueChange={(val) => setValue("campoutId", val)}
                                    value={watchedCampoutId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Event" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">-- None --</SelectItem>
                                        {campouts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {showPaymentMethod && (
                        <div className="bg-muted/30 p-4 rounded-md border mt-4">
                            <Label className="block mb-2">Payment Method</Label>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="CASH"
                                            checked={paymentMethod === 'CASH'}
                                            onChange={() => setPaymentMethod('CASH')}
                                            className="w-4 h-4"
                                        />
                                        <span>Cash / Check / External</span>
                                    </label>
                                    <label className={`flex items-center gap-2 cursor-pointer ${ibaBalance <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value="IBA"
                                            checked={paymentMethod === 'IBA'}
                                            onChange={() => setPaymentMethod('IBA')}
                                            disabled={ibaBalance <= 0}
                                            className="w-4 h-4"
                                        />
                                        <span>Use IBA Funds</span>
                                    </label>
                                </div>
                                {paymentMethod === 'IBA' && (
                                    <div className="text-sm text-muted-foreground mt-1">
                                        Available Balance: <strong>${ibaBalance.toFixed(2)}</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit">Record</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
