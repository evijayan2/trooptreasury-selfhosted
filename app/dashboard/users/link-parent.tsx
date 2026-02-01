"use client"

import { useState } from "react"
import { useFormStatus } from "react-dom"
import { linkParentToScout } from "@/app/actions"
import { toast } from "sonner"
import { Plus, Link as LinkIcon } from "lucide-react"

export default function LinkParentForm({ parentId, scouts, slug }: { parentId: string, scouts: { id: string, name: string }[], slug: string }) {
    const [selectedScoutId, setSelectedScoutId] = useState("")

    async function handleLink() {
        if (!selectedScoutId) return toast.error("Select a scout first")

        const result = await linkParentToScout(parentId, selectedScoutId, slug)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Parent linked successfully")
            setSelectedScoutId("")
        }
    }

    return (
        <div className="flex items-center gap-2 mt-2">
            <select
                className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
                value={selectedScoutId}
                onChange={(e) => setSelectedScoutId(e.target.value)}
            >
                <option value="">Link a Scout...</option>
                {scouts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
            <button
                onClick={handleLink}
                className="bg-primary text-primary-foreground p-1 rounded hover:bg-primary/90"
                disabled={!selectedScoutId}
            >
                <LinkIcon size={16} />
            </button>
        </div>
    )
}
