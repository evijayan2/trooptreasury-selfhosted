"use client"

import { Button } from "@/components/ui/button"
import { Download, Loader2 } from "lucide-react"
import { useState } from "react"
import { exportTroopData } from "@/app/actions/export-data"
import { toast } from "sonner"

export function ExportDataButton({ slug }: { slug: string }) {
    const [loading, setLoading] = useState(false)

    const handleExport = async () => {
        try {
            setLoading(true)
            const result = await exportTroopData(slug)

            if (result.success && result.data) {
                // Convert base64 to blob
                const byteCharacters = atob(result.data)
                const byteNumbers = new Array(byteCharacters.length)
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i)
                }
                const byteArray = new Uint8Array(byteNumbers)
                const blob = new Blob([byteArray], { type: "application/zip" })

                // Trigger download
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = result.filename
                document.body.appendChild(a)
                a.click()
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)

                toast.success("Export downloaded successfully")
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to export data")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button onClick={handleExport} disabled={loading} variant="outline" className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export Data (ZIP)
        </Button>
    )
}
