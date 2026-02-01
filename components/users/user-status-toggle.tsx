"use client"

import { toggleUserStatus } from "@/app/actions"
import { Switch } from "@/components/ui/switch"
import { useState, useTransition } from "react"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

export function UserStatusToggle({ user, slug }: { user: any, slug: string }) {
    const [isPending, startTransition] = useTransition()
    // Optimistic UI state could be added here, but for now relying on server revalidation
    const isActive = user.isActive

    const handleToggle = (checked: boolean) => {
        startTransition(async () => {
            // checked means we want it ACTIVE. 
            // If currently isActive=true, and we click, checked becomes false.
            // The action takes `shouldDeactivate`.
            // If we want to ACTIVATE (checked=true), shouldDeactivate=false.
            // If we want to DEACTIVATE (checked=false), shouldDeactivate=true.
            const shouldDeactivate = !checked
            await toggleUserStatus(user.id, shouldDeactivate, slug)
        })
    }

    return (
        <div className="flex items-center gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div>
                        <Switch
                            checked={isActive}
                            onCheckedChange={handleToggle}
                            disabled={isPending}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Toggle user activation status</p>
                </TooltipContent>
            </Tooltip>
            <span className={`text-xs ${isActive ? "text-green-600" : "text-gray-500"}`}>
                {isActive ? "Active" : "Inactive"}
            </span>
        </div>
    )
}
