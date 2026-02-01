"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Unlock } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "sonner"
import { useSession } from "next-auth/react"
import { notifyWithLog } from "@/lib/notify-client"

export function UnlockAccountButton({ userId, slug, onUnlock }: { userId: string, slug: string, onUnlock?: () => void }) {
    const { data: session } = useSession()
    const [loading, setLoading] = useState(false)

    const handleUnlock = async () => {
        setLoading(true)
        try {
            const { unlockUserAccount } = await import("@/app/actions/unlock-account")
            const result = await unlockUserAccount(userId, slug)

            if (result.success) {
                notifyWithLog({
                    userId: session?.user?.id || "",
                    title: "Account Unlocked",
                    message: "User account unlocked successfully.",
                    type: "success"
                })
                onUnlock?.()
            } else {
                toast.error(result.error || "Failed to unlock account")
            }
        } catch (error) {
            console.error("Unlock error:", error)
            toast.error("Failed to unlock account")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlock}
                    disabled={loading}
                >
                    <Unlock className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                Unlock account (reset failed login attempts)
            </TooltipContent>
        </Tooltip>
    )
}
