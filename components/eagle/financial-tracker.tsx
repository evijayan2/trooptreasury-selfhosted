'use client'

import { EagleProjectFinancial, EagleFinancialType, EagleProjectStatus } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addFinancialEntry, deleteFinancialEntry } from "@/lib/actions/eagle-project"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface FinancialTrackerProps {
    projectId: string
    initialData: EagleProjectFinancial[]
    troopSlug: string
    projectStatus: EagleProjectStatus
}

export function FinancialTracker({ projectId, initialData, troopSlug, projectStatus }: FinancialTrackerProps) {
    const [open, setOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const router = useRouter()

    const income = initialData.filter(d => d.type === 'INCOME').reduce((acc, curr) => acc + Number(curr.amount), 0)
    const expenses = initialData.filter(d => d.type === 'EXPENSE').reduce((acc, curr) => acc + Number(curr.amount), 0)
    const balance = income - expenses

    async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const type = formData.get('type') as EagleFinancialType
        const amount = Number(formData.get('amount'))
        const description = formData.get('description') as string
        const category = formData.get('category') as string

        const result = await addFinancialEntry(troopSlug, {
            projectId,
            type,
            amount,
            description,
            category,
            date: new Date()
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Entry added")
            setOpen(false)
            router.refresh()
        }
        setIsSubmitting(false)
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure?")) return
        const result = await deleteFinancialEntry(troopSlug, id)
        if (result.error) toast.error(result.error)
        else {
            toast.success("Deleted")
            router.refresh()
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Income</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">${income.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">${expenses.toFixed(2)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Remaining Budget</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">${balance.toFixed(2)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Transactions</CardTitle>
                        <CardDescription>Log materials, supplies, and donations.</CardDescription>
                    </div>
                    {projectStatus === EagleProjectStatus.OPEN && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Entry</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Add Financial Entry</DialogTitle></DialogHeader>
                                <form onSubmit={handleAdd} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Type</Label>
                                        <Select name="type" defaultValue="EXPENSE">
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EXPENSE">Expense</SelectItem>
                                                <SelectItem value="INCOME">Income / Donation</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Amount</Label>
                                        <Input name="amount" type="number" step="0.01" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Description</Label>
                                        <Input name="description" placeholder="e.g. Lumber from Home Depot" required />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Category</Label>
                                        <Input name="category" placeholder="e.g. Materials, Tools" />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmitting}>Save</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">No entries found.</TableCell>
                                </TableRow>
                            )}
                            {initialData.map(entry => (
                                <TableRow key={entry.id}>
                                    <TableCell>{format(new Date(entry.date), 'MMM d, yyyy')}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell>{entry.category}</TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${entry.type === 'INCOME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {entry.type}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right font-mono">${Number(entry.amount).toFixed(2)}</TableCell>
                                    <TableCell>
                                        {projectStatus === EagleProjectStatus.OPEN && (
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div >
    )
}
