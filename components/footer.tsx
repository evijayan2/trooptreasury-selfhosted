"use client"

import { useEffect, useState } from "react"
import { formatDateTimeEST } from "@/lib/utils"

export function Footer() {
    const [time, setTime] = useState<Date | null>(null)

    useEffect(() => {
        setTime(new Date())
        const timer = setInterval(() => {
            setTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    if (!time) return null // Avoid hydration mismatch by rendering nothing on server/first paint

    return (
        <footer className="mt-auto py-6 border-t text-center text-sm text-muted-foreground w-full">
            <div className="flex flex-col md:flex-row justify-between items-center px-4 gap-2">
                <div>
                    &copy; {new Date().getFullYear()} TroopTreasury. All rights reserved.
                </div>
                <div>
                    Contact: support@trooptreasury.com | (555) 123-4567
                </div>
                <div className="font-mono text-xs">
                    {formatDateTimeEST(time)} (EST)
                </div>
            </div>
        </footer>
    )
}
