"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { issueRefund } from "@/app/actions/admin"
import { toast } from "sonner"
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

interface RefundButtonProps {
    chargeId: string
    isRefunded: boolean
    amount: number // in cents
}

export function RefundButton({ chargeId, isRefunded, amount }: RefundButtonProps) {
    const [loading, setLoading] = useState(false)

    async function handleRefund() {
        setLoading(true)
        try {
            await issueRefund(chargeId)
            toast.success("Refund processed successfully")
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    if (isRefunded) {
        return (
            <Badge variant="outline" className="opacity-50">Refunded</Badge>
        )
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-white hover:bg-destructive">
                    Refund
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will issue a full refund of ${(amount / 100).toFixed(2)} for this charge. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault()
                            handleRefund()
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={loading}
                    >
                        {loading ? "Processing..." : "Issue Refund"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
