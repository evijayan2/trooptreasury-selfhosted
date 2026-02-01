"use client"

import { useState, useTransition } from "react"
import { distributeFundraising } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

type Category = "EXTERNAL" | "SCOUT"

interface Allocation {
    id: string
    category: Category
    description: string // e.g., "Donation to X" or "Share"
    amount: string
    scoutId?: string
}

export function FundraisingForm({ scouts, slug }: { scouts: { id: string, name: string }[], slug: string }) {
    const [isPending, startTransition] = useTransition()
    const [totalRaised, setTotalRaised] = useState("")
    const [campaignName, setCampaignName] = useState("")
    const [allocations, setAllocations] = useState<Allocation[]>([])

    const addAllocation = () => {
        setAllocations([...allocations, {
            id: crypto.randomUUID(),
            category: "SCOUT",
            description: "",
            amount: ""
        }])
    }

    const removeAllocation = (id: string) => {
        setAllocations(allocations.filter(a => a.id !== id))
    }

    const updateAllocation = (id: string, field: keyof Allocation, value: string) => {
        setAllocations(allocations.map(a => a.id === id ? { ...a, [field]: value } : a))
    }

    const totalAllocated = allocations.reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
    const remainder = (Number(totalRaised) || 0) - totalAllocated

    const handleSubmit = async (formData: FormData) => {
        // Validate
        if (remainder < 0) {
            toast.error("Allocations exceed total raised!")
            return
        }

        const payload = allocations.map(a => ({
            category: a.category,
            description: a.description || (a.category === 'SCOUT' ? 'Scout Share' : 'Expense'),
            amount: Number(a.amount),
            scoutId: a.scoutId
        }))

        // Append JSON
        formData.set("allocations", JSON.stringify(payload))

        startTransition(async () => {
            const result = await distributeFundraising(null, formData)
            if (result.error) {
                toast.error(result.error)
            } else {
                toast.success("Fundraising distributed!")
                // Reset form
                setCampaignName("")
                setTotalRaised("")
                setAllocations([])
            }
        })
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="campaignName">Campaign Name</Label>
                    <Input
                        id="campaignName"
                        name="campaignName"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        placeholder="e.g. Popcorn Sales 2024"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="totalRaised">Total Raised ($)</Label>
                    <Input
                        id="totalRaised"
                        name="totalRaised"
                        type="number"
                        step="0.01"
                        value={totalRaised}
                        onChange={(e) => setTotalRaised(e.target.value)}
                        placeholder="0.00"
                        required
                    />
                </div>
            </div>

            <div className="border rounded-md p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Allocations</h3>
                    <Button type="button" variant="outline" size="sm" onClick={addAllocation}>
                        <Plus className="mr-2 h-4 w-4" /> Add Allocation
                    </Button>
                </div>

                {allocations.length === 0 && (
                    <p className="text-sm text-gray-500 italic text-center py-4">
                        No allocations added. All funds will stay in Troop Treasury.
                    </p>
                )}

                {allocations.map((alloc) => (
                    <div key={alloc.id} className="grid gap-2 sm:grid-cols-12 items-end border-b pb-4 last:border-0 last:pb-0">
                        <div className="sm:col-span-3 space-y-1">
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={alloc.category}
                                onValueChange={(v) => updateAllocation(alloc.id, "category", v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SCOUT">Scout Share</SelectItem>
                                    <SelectItem value="EXTERNAL">External Expense/Donation</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {alloc.category === 'SCOUT' ? (
                            <div className="sm:col-span-4 space-y-1">
                                <Label className="text-xs">Scout</Label>
                                <Select
                                    value={alloc.scoutId}
                                    onValueChange={(v) => updateAllocation(alloc.id, "scoutId", v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Scout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scouts.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="sm:col-span-4 space-y-1">
                                <Label className="text-xs">Description</Label>
                                <Input
                                    value={alloc.description}
                                    onChange={(e) => updateAllocation(alloc.id, "description", e.target.value)}
                                    placeholder="e.g. Donation to Church"
                                />
                            </div>
                        )}

                        <div className="sm:col-span-4 space-y-1">
                            <Label className="text-xs">Amount</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={alloc.amount}
                                onChange={(e) => updateAllocation(alloc.id, "amount", e.target.value)}
                                placeholder="0.00"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeAllocation(alloc.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Card className={remainder < 0 ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "bg-gray-50 dark:bg-slate-800/50"}>
                <CardContent className="pt-6 flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Remainder (To Troop Fund)</p>
                        <p className={`text-2xl font-bold ${remainder < 0 ? "text-red-600" : ""}`}>
                            {formatCurrency(remainder)}
                        </p>
                    </div>
                    <div>
                        <Button type="submit" disabled={isPending || remainder < 0}>
                            {isPending ? "Processing..." : "Distribute Funds"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <input type="hidden" name="slug" value={slug} />
        </form >
    )
}
