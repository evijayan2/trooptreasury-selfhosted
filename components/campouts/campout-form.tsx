"use client"

import { useActionState } from "react"
import { createCampout } from "@/app/actions/campouts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"


export function CampoutForm({ onClose, slug }: { onClose?: () => void; slug: string }) {
    const [state, dispatch, isPending] = useActionState(createCampout, undefined)

    return (
        <form action={async (formData) => {
            await dispatch(formData)
            if (onClose) onClose()
        }} className="space-y-4">
            <input type="hidden" name="slug" value={slug} />
            <div className="space-y-2">
                <Label htmlFor="name">Campout Name</Label>
                <Input id="name" name="name" placeholder="e.g. Winter Freeze" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="e.g. Camp Alpine" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description & Notes (What to bring)</Label>
                <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter details about the campout, packing list, departure times, etc."
                    className="min-h-[100px]"
                />
            </div>


            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input id="startDate" name="startDate" type="date" required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input id="endDate" name="endDate" type="date" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="costEstimate">Cost Estimate ($)</Label>
                <Input id="costEstimate" name="costEstimate" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="scoutLimit">Scout Limit (Optional)</Label>
                    <Input id="scoutLimit" name="scoutLimit" type="number" min="1" placeholder="No limit" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="adultLimit">Adult Limit (Optional)</Label>
                    <Input id="adultLimit" name="adultLimit" type="number" min="1" placeholder="No limit" />
                </div>
            </div>


            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
            {state?.success && <p className="text-green-500 text-sm">{state.message}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Scheduling..." : "Schedule Campout"}
            </Button>
        </form>
    )
}
