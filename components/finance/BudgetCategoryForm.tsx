"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useState } from "react"
import { upsertBudgetCategory, deleteBudgetCategory } from "@/app/actions/finance"
import { toast } from "sonner"
import { BudgetCategoryType } from "@prisma/client"
import { Trash2 } from "lucide-react"

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.nativeEnum(BudgetCategoryType),
    plannedIncome: z.string().optional(),
    plannedExpense: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function BudgetCategoryForm({ budgetId, category, triggerButton, slug }: { budgetId: string, category?: any, triggerButton: React.ReactNode, slug: string }) {
    const [open, setOpen] = useState(false)

    const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: category?.name || "",
            type: category?.type || "EXPENSE",
            plannedIncome: category?.plannedIncome?.toString() || "0",
            plannedExpense: category?.plannedExpense?.toString() || "0",
        }
    })

    const onSubmit = async (data: FormData) => {
        const formData = new FormData()
        formData.append("budgetId", budgetId)
        if (category?.id) formData.append("id", category.id)
        formData.append("slug", slug)

        formData.append("name", data.name)
        formData.append("type", data.type)
        formData.append("plannedIncome", data.plannedIncome || "0")
        formData.append("plannedExpense", data.plannedExpense || "0")

        const result = await upsertBudgetCategory(null, formData)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Category saved")
            setOpen(false)
            reset()
        }
    }

    const handleDelete = async () => {
        const res = await deleteBudgetCategory(category.id, slug)
        if (res.error) toast.error(res.error)
        else {
            toast.success("Category deleted")
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerButton}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{category ? "Edit Category" : "Add Budget Category"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" {...register("name")} />
                        {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="type">Type</Label>
                        <Select onValueChange={(val: any) => setValue("type", val)} defaultValue={category?.type || "EXPENSE"}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INCOME">Income</SelectItem>
                                <SelectItem value="EXPENSE">Expense</SelectItem>
                                <SelectItem value="BOTH">Both</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="plannedIncome">Planned Income</Label>
                            <Input id="plannedIncome" type="number" step="0.01" {...register("plannedIncome")} />
                        </div>
                        <div>
                            <Label htmlFor="plannedExpense">Planned Costs</Label>
                            <Input id="plannedExpense" type="number" step="0.01" {...register("plannedExpense")} />
                        </div>
                    </div>

                    <div className="flex justify-between pt-4">
                        {category?.id && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button type="button" variant="destructive">
                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete this budget category. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button type="submit">Save</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

