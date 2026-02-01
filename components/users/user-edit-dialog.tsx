"use client"

import { useActionState, useState, useEffect } from "react"
import { updateUser } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
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
import { Pencil } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function UserEditDialog({ user, allScouts = [], slug }: { user: any, allScouts?: any[], slug: string }) {
    const [open, setOpen] = useState(false)
    const [state, dispatch, isPending] = useActionState(updateUser, undefined)
    const [selectedRole, setSelectedRole] = useState(user.role)

    useEffect(() => {
        if (state?.success) {
            setOpen(false)
        }
    }, [state])

    const availableScouts = allScouts.filter(s => !s.userId || s.id === user.scout?.id)

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Edit user details and roles</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                        Update user details and permissions.
                    </DialogDescription>
                </DialogHeader>
                <form action={dispatch} className="space-y-4 py-4">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="slug" value={slug} />

                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={user.name} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" defaultValue={user.role} onValueChange={setSelectedRole} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ADMIN">Admin</SelectItem>
                                <SelectItem value="FINANCIER">Financier</SelectItem>
                                <SelectItem value="LEADER">Leader (Assistant)</SelectItem>
                                <SelectItem value="SCOUT">Scout</SelectItem>
                                <SelectItem value="PARENT">Parent</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedRole === 'SCOUT' && (
                        <div className="space-y-2 border-t pt-4">
                            <Label htmlFor="scoutId">Linked Scout Identity</Label>
                            <p className="text-xs text-gray-500 mb-2">
                                Link this user login to a specific Scout in the roster.
                            </p>
                            <Select name="scoutId" defaultValue={user.scout?.id || "none"}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select scout roster entry..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- No Link (Not Recommended) --</SelectItem>
                                    {availableScouts.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name} {s.id === user.scout?.id ? "(Current)" : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}

                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
