"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CampoutList } from "./campout-list"
import { cn } from "@/lib/utils"

interface CampoutYearGroupProps {
    year: number
    campouts: any[]
    defaultOpen?: boolean
    slug: string
}

export function CampoutYearGroup({ year, campouts, defaultOpen = false, slug }: CampoutYearGroupProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="space-y-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full text-left hover:bg-muted/50 p-2 -ml-2 rounded-lg transition-colors"
            >
                {isOpen ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">{year}</h2>
                <Badge variant="secondary" className="ml-2">{campouts.length}</Badge>
            </button>

            {isOpen && (
                <div className="pl-7">
                    <CampoutList campouts={campouts} slug={slug} />
                </div>
            )}
        </div>
    )
}
