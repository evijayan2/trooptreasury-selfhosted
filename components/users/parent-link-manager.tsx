"use client"

import { useState } from "react"
import { linkParentToScout, unlinkParentFromScout } from "@/app/actions"
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trash2, Link as LinkIcon } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { notifyWithLog } from "@/lib/notify-client"

export function ParentLinkManager({ user, allScouts, slug }: { user: any, allScouts: any[], slug: string }) {
    const { data: session } = useSession()
    const [selectedScout, setSelectedScout] = useState<string>("")
    const [open, setOpen] = useState(false)

    // Ensure parentLinks is an array, defaulting to empty if undefined
    const parentLinks = user.parentLinks || []

    // Filter available scouts (not already linked)
    const availableScouts = allScouts.filter(s => !parentLinks.some((pl: any) => pl.scoutId === s.id))

    const handleLink = async () => {
        if (!selectedScout) return
        const result = await linkParentToScout(user.id, selectedScout, slug)
        if (result.success) {
            setSelectedScout("")
            notifyWithLog({
                userId: session?.user?.id || "",
                title: "Scout Linked",
                message: "Scout linked successfully.",
                type: "success"
            })
        } else {
            toast.error(result.error)
        }
    }

    const handleUnlink = async (scoutId: string) => {
        const result = await unlinkParentFromScout(user.id, scoutId, slug)
        if (result.success) {
            notifyWithLog({
                userId: session?.user?.id || "",
                title: "Scout Unlinked",
                message: "Scout unlinked successfully.",
                type: "success"
            })
        } else {
            toast.error(result.error)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <LinkIcon className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Manage linked scouts for this parent</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Scouts for {user.name}</DialogTitle>
                    <DialogDescription>
                        Link scouts to this parent account so they can view their balances.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex space-x-2">
                        <Select value={selectedScout} onValueChange={setSelectedScout}>
                            <SelectTrigger className="grow">
                                <SelectValue placeholder="Select scout to link" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableScouts.map(scout => (
                                    <SelectItem key={scout.id} value={scout.id}>{scout.name}</SelectItem>
                                ))}
                                {availableScouts.length === 0 && <SelectItem value="none" disabled>No scouts available</SelectItem>}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleLink} disabled={!selectedScout}>Link</Button>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-sm font-medium">Linked Scouts</h4>
                        {parentLinks.length === 0 ? (
                            <p className="text-sm text-gray-500">No scouts linked.</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {parentLinks.map((link: any) => (
                                    <Badge key={link.scoutId} variant="outline" className="flex items-center gap-2 pl-2 pr-1 py-1">
                                        {link.scout.name}
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-4 w-4 rounded-full hover:bg-red-100 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Unlink Scout?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to unlink {link.scout.name} from this parent account?
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleUnlink(link.scoutId)}>Unlink</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
