"use client"

import { useEffect, useState } from "react"
import { Mail, Clock } from "lucide-react"

export function FooterInfo() {
    const [date, setDate] = useState<Date | null>(null)

    useEffect(() => {
        setDate(new Date())
        const timer = setInterval(() => setDate(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    // Prevent hydration mismatch by not rendering date until mounted
    if (!date) return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground w-full max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-4">
                <span>&copy; {new Date().getFullYear()} TroopTreasury</span>
            </div>
        </div>
    )

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground w-full max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-6">
                <span>&copy; {date.getFullYear()} TroopTreasury</span>
                <span className="hidden md:inline text-gray-300">|</span>
                <a href="mailto:support@trooptreasury.com" className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Mail className="h-3 w-3" />
                    support@trooptreasury.com
                </a>
            </div>

            <div className="flex items-center gap-2 font-mono">
                <Clock className="h-3 w-3" />
                <span>
                    {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    {" • "}
                    {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </div>
    )
}
