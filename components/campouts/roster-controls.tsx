"use client"

import { promoteFromWaitlist, demoteToWaitlist } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { ArrowUpCircle, ArrowDownCircle } from "lucide-react"
import { toast } from "sonner"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface RosterControlProps {
    campoutId: string
    id: string
    type: 'SCOUT' | 'ADULT'
    name?: string
}

export function PromoteButton({ campoutId, id, type, name }: RosterControlProps) {
    const handlePromote = async () => {
        const result = await promoteFromWaitlist(campoutId, id, type)
        if ("error" in result) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePromote}
                    className="h-6 w-6 text-gray-400 hover:text-green-600"
                >
                    <ArrowUpCircle className="w-4 h-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Promote to Reserved List</p>
            </TooltipContent>
        </Tooltip>
    )
}

export function DemoteButton({ campoutId, id, type, name }: RosterControlProps) {
    const handleDemote = async () => {
        const result = await demoteToWaitlist(campoutId, id, type)
        if ("error" in result) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDemote}
                    className="h-6 w-6 text-gray-400 hover:text-amber-600"
                >
                    <ArrowDownCircle className="w-4 h-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>Move to Waitlist</p>
            </TooltipContent>
        </Tooltip>
    )
}
