"use client"

import { Button } from "@/components/ui/button"
import { DollarSign } from "lucide-react"
import { toast } from "sonner"

export function PayCashButton({ message, label = "Pay Cash" }: { message: string, label?: string }) {
    return (
        <Button variant="outline" size="sm" className="w-full" onClick={() => toast.info(message)}>
            <DollarSign className="w-3 h-3 mr-1" /> {label}
        </Button>
    )
}
