"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { requestPayout } from "@/app/actions/campouts"
import { toast } from "sonner"
import { Loader2, Send } from "lucide-react"

interface RequestPayoutButtonProps {
    campoutId: string
    slug: string
    amount: number
    label?: string
}

export function RequestPayoutButton({ campoutId, slug, amount, label = "Request Payout" }: RequestPayoutButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleRequest = async () => {
        setLoading(true)
        try {
            const res = await requestPayout(campoutId, slug, amount)
            if (res.success) {
                toast.success(res.message)
            } else {
                toast.error(res.error)
            }
        } catch (err: any) {
            toast.error("Failed to send request")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            size="sm"
            variant="outline"
            onClick={handleRequest}
            disabled={loading}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
        >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {label}
        </Button>
    )
}
