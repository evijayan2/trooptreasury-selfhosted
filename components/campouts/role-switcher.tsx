"use client"

import { switchAdultRole } from "@/app/actions"
import { RefreshCcw } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function RoleSwitcher({ campoutId, adultId, currentRole }: { campoutId: string, adultId: string, currentRole: "ORGANIZER" | "ATTENDEE" }) {
    const targetRole = currentRole === "ORGANIZER" ? "ATTENDEE" : "ORGANIZER"
    const label = currentRole === "ORGANIZER" ? "Switch to Attendee (Pay)" : "Switch to Organizer"

    return (
        <form action={async () => {
            await switchAdultRole(campoutId, adultId, currentRole, targetRole)
        }}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button type="submit" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 mt-1">
                        <RefreshCcw className="w-3 h-3" /> {label}
                    </button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Toggle between Organizer (free) and Attendee (paying) roles</p>
                </TooltipContent>
            </Tooltip>
        </form>
    )
}
