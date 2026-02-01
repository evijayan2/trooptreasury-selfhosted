"use client"

import { useState } from "react"
import { publishCampout, openCampoutPayments, deleteCampout } from "@/app/actions/campouts"
import { Button } from "@/components/ui/button"
import { CheckCircle, Megaphone, Trash2, AlertTriangle, Loader2 } from "lucide-react"
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
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CampoutLifecycleProps {
    campoutId: string
    slug: string
    status: "DRAFT" | "OPEN" | "READY_FOR_PAYMENT" | "CLOSED"
    campoutName: string
}

export function CampoutLifecycleActions({ campoutId, slug, status, campoutName }: CampoutLifecycleProps) {
    const [loading, setLoading] = useState<string | null>(null)
    const router = useRouter()

    const handleAction = async (action: "publish" | "open_payments" | "delete") => {
        setLoading(action)
        try {
            let res: any
            if (action === "publish") {
                res = await publishCampout(campoutId, slug)
            } else if (action === "open_payments") {
                res = await openCampoutPayments(campoutId, slug)
            } else if (action === "delete") {
                res = await deleteCampout(campoutId, slug)
                if (res.success) {
                    toast.success("Campout deleted")
                    router.push(`/dashboard/campouts`)
                    return
                }
            }

            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (error: any) {
            toast.error("Action failed")
        } finally {
            setLoading(null)
        }
    }

    if (status === "DRAFT") {
        return (
            <div className="flex gap-2">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="default" disabled={!!loading}>
                            {loading === "publish" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Megaphone className="w-4 h-4 mr-2" />}
                            Publish & Announce
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Publish Campout?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will change the status to OPEN and notify all troop members (Parents, Leaders, Scouts) about "{campoutName}". They will be able to see the details.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAction("publish")}>Publish</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!!loading}>
                            {loading === "delete" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{campoutName}"? This cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleAction("delete")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        )
    }

    if (status === "OPEN") {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700" disabled={!!loading}>
                        {loading === "open_payments" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                        Finalize & Open Payments
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Open Payments?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will change the status to READY FOR PAYMENT. It locks structural changes and notifies everyone that they can start paying.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleAction("open_payments")}>Open Payments</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )
    }

    return null
}
