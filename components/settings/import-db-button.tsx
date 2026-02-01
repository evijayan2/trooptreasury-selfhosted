'use client'

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Upload } from "lucide-react"
import { restoreFromReplayJson } from "@/app/actions/export-db-script"
import { toast } from "sonner"
import { useState, useRef } from "react"

export function ImportDbButton() {
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setLoading(true)
            toast.info("Restoring data...")

            const text = await file.text()
            const result = await restoreFromReplayJson(text)

            if (result.success) {
                toast.success("Data restored successfully")
                // Refresh the page to show new data might be a good idea, or let user decide
                setTimeout(() => window.location.reload(), 1500)
            } else {
                toast.error("Failed to restore data: " + result.error)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to read file or restore data")
        } finally {
            setLoading(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    return (
        <>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
            />
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button onClick={handleClick} disabled={loading} variant="default">
                        <Upload className="mr-2 h-4 w-4" />
                        {loading ? "Restoring..." : "Upload & Replay"}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Upload a previously exported JSON file to restore the database</p>
                </TooltipContent>
            </Tooltip>
        </>
    )
}
