"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { factoryResetData } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"

export function ResetDatabaseCard() {
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleReset = async () => {
        if (confirmText !== "DELETE") return

        startTransition(async () => {
            try {
                await factoryResetData()
                toast.success("Factory reset complete")
                setOpen(false)
                setConfirmText("")
            } catch (error: any) {
                toast.error(error.message || "Failed to reset data")
            }
        })
    }

    return (
        <Card className="border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/10">
            <CardHeader>
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                    <CardTitle>Danger Zone</CardTitle>
                </div>
                <CardDescription className="text-red-600/80 dark:text-red-400/80">
                    Actions here are irreversible and can cause permanent data loss.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Perform a factory reset to clear all Scouts, Campouts, Transactions, and non-Admin users.
                    This allows you to start fresh while keeping your Admin account and Troop settings.
                </p>
            </CardContent>
            <CardFooter>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full sm:w-auto gap-2">
                            <Trash2 className="h-4 w-4" />
                            Factory Reset Data
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Are you absolutely sure?</DialogTitle>
                            <DialogDescription>
                                This action cannot be undone. This will permanently delete:
                            </DialogDescription>
                            <ul className="list-disc list-inside mt-2 mb-2 font-medium text-red-600 dark:text-red-400 text-sm">
                                <li>All Scouts</li>
                                <li>All Campouts</li>
                                <li>All Financial Transactions</li>
                                <li>All Parent & Scout Accounts</li>
                            </ul>
                            <p className="text-sm text-muted-foreground">
                                Only Admin accounts will be preserved.
                            </p>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="confirm">Type DELETE to confirm</Label>
                                <Input
                                    id="confirm"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="DELETE"
                                    className="border-red-300 focus-visible:ring-red-500"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReset}
                                disabled={confirmText !== "DELETE" || isPending}
                            >
                                {isPending ? "Resetting..." : "Confirm Reset"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    )
}
