"use client"

import { useState } from "react"
import { registerAdultForCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { toast } from "sonner"

interface AddAttendeeDialogProps {
    campoutId: string
    slug: string
    availableAdults: { id: string, name: string }[]
}

export function AddAttendeeDialog({ campoutId, slug, availableAdults }: AddAttendeeDialogProps) {
    const [open, setOpen] = useState(false)
    const [selectedAdult, setSelectedAdult] = useState<string>("")

    const handleRegister = async () => {
        if (!selectedAdult) return
        const result = await registerAdultForCampout(campoutId, selectedAdult, slug)
        if (result.success) {
            setOpen(false)
            setSelectedAdult("")
            toast.success("Adult registered successfully")
        } else {
            toast.error(result.error)
        }
    }

    if (availableAdults.length === 0) return null

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs bg-transparent border-dashed">
                    <Plus className="w-3 h-3 mr-1" /> Add Attendee
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register Adult Attendee</DialogTitle>
                    <DialogDescription>
                        Add an adult to this campout roster.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <Select onValueChange={setSelectedAdult} value={selectedAdult}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an adult" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            {availableAdults.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleRegister} disabled={!selectedAdult} className="w-full">
                        Register
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
