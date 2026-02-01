'use client'

import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Download } from "lucide-react"
import { generateReplayJson } from "@/app/actions/export-db-script"
import { toast } from "sonner"
import { useState } from "react"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ImportDbButton } from "./import-db-button"

export function ExportDbButton() {
    const [loading, setLoading] = useState(false)

    const handleDownload = async () => {
        try {
            setLoading(true)
            toast.info("Generating replay data...")

            const jsonContent = await generateReplayJson()

            const blob = new Blob([jsonContent], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = 'troop-treasury-replay.json'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success("Data exported successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to generate export")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Replay</CardTitle>
                <CardDescription>
                    Export current data for testing or restore from a previous export.
                    Exports exclude Admins and reset user passwords to '123456'.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-4">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button onClick={handleDownload} disabled={loading} variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            {loading ? "Exporting..." : "Export Replay Data"}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Download a copy of the database for testing purposes</p>
                    </TooltipContent>
                </Tooltip>
                <ImportDbButton />
            </CardContent>
        </Card>
    )
}
