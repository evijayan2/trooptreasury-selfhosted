"use client"

import { useActionState } from "react"
import { createScout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export function ScoutForm({ onClose }: { onClose?: () => void }) {
    const [state, dispatch, isPending] = useActionState(createScout, undefined)

    return (
        <form action={async (formData) => {
            await dispatch(formData)
            if (onClose) onClose()
        }} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Scout Name</Label>
                <Input id="name" name="name" placeholder="Name" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="age">Age (Optional)</Label>
                <Input id="age" name="age" type="number" placeholder="Age" />
            </div>

            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue="ACTIVE">
                    <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
            {state?.success && <p className="text-green-500 text-sm">{state.message}</p>}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add Scout"}
            </Button>
        </form>
    )
}
