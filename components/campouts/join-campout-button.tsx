
"use client"

import { useState } from "react"
import { registerScoutForCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

interface JoinCampoutButtonProps {
    campoutId: string
    scoutId: string
    className?: string
}

export function JoinCampoutButton({ campoutId, scoutId, className }: JoinCampoutButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleJoin = async () => {
        setLoading(true)
        try {
            const result = await registerScoutForCampout(campoutId, scoutId)
            if ("error" in result) {
                toast.error(result.error)
            } else {
                toast.success("You have joined the campout!")
            }
        } catch (error) {
            toast.error("Failed to join campout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleJoin} disabled={loading} size="sm" className={className}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Join Campout
        </Button>
    )
}
