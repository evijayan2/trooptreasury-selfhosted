"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronDown } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { getUserTroopMemberships, UserTroopMembership } from "@/app/actions/switch-troop"

interface TroopSwitcherProps {
    currentSlug: string
    currentTroopName: string
    isScout?: boolean
}

export function TroopSwitcher({ currentSlug, currentTroopName, isScout }: TroopSwitcherProps) {
    const router = useRouter()
    const [troops, setTroops] = useState<UserTroopMembership[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadTroops() {
            const memberships = await getUserTroopMemberships()
            setTroops(memberships)
            setLoading(false)
        }
        loadTroops()
    }, [])

    // Don't show dropdown for scouts
    if (isScout) {
        return <span className="font-semibold text-sm px-3 capitalize">{currentTroopName}</span>
    }

    // Don't show dropdown if user only has one troop
    if (!loading && troops.length <= 1) {
        return <span className="font-semibold text-sm px-3 capitalize">{currentTroopName}</span>
    }

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2">
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
            </div>
        )
    }

    const handleTroopSwitch = (slug: string) => {
        if (slug !== currentSlug) {
            router.push(`/dashboard`)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3">
                    <span className="font-semibold text-sm capitalize">{currentTroopName}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground uppercase">
                    Switch Troop
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {troops.map((troop) => (
                    <DropdownMenuItem
                        key={troop.troopId}
                        onClick={() => handleTroopSwitch(troop.troopSlug)}
                        className="flex items-center justify-between cursor-pointer"
                    >
                        <div className="flex flex-col">
                            <span className="font-medium capitalize">{troop.troopName}</span>
                            <span className="text-xs text-muted-foreground">{troop.role}</span>
                        </div>
                        {troop.troopSlug === currentSlug && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
