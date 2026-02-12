
"use client"

import { useState } from "react"
import { joinCampoutAsAdult } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

interface JoinAsAdultButtonProps {
    campoutId: string
    slug: string
    className?: string
}

export function JoinAsAdultButton({ campoutId, slug, className }: JoinAsAdultButtonProps) {
    const [loading, setLoading] = useState(false)

    const handleJoin = async () => {
        setLoading(true)
        try {
            const result = await joinCampoutAsAdult(campoutId, slug)
            if ("error" in result) {
                toast.error(result.error)
            } else {
                toast.success("You have joined the campout as an adult!")
            }
        } catch (error) {
            toast.error("Failed to join campout")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleJoin} disabled={loading} size="sm" variant="outline" className={className}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            I'm Going (Adult)
        </Button>
    )
}
