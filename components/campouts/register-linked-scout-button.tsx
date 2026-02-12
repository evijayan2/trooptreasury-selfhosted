
"use client"

import { useState } from "react"
import { registerScoutForCampout } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

interface RegisterLinkedScoutButtonProps {
    campoutId: string
    scoutId: string
    scoutName: string
    slug: string
    className?: string
}

export function RegisterLinkedScoutButton({ campoutId, scoutId, scoutName, slug, className }: RegisterLinkedScoutButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleRegister = async () => {
        setLoading(true)
        try {
            // Pass slug as the 3rd argument we just added
            const result = await registerScoutForCampout(campoutId, scoutId, slug)
            if ("error" in result) {
                toast.error(result.error)
            } else {
                toast.success(`Registered ${scoutName} successfully!`)
            }
        } catch (error) {
            toast.error("Failed to register scout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleRegister} disabled={loading} size="sm" className={className}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Register {scoutName}
        </Button>
    )
}
