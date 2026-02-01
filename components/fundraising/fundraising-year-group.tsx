"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
// Assuming CampaignCard is exported or we can redefine/import it. 
// Ideally should be shared, but for now I'll check how it's used in dashboard.
// Since CampaignCard is defined inside fundraising-dashboard.tsx and not exported, 
// I will need to refactor fundraising-dashboard.tsx to export it OR duplicate it briefly.
// Better: Refactor dashboard to export it or move it to a separate file.
// For this step, I will assume I can import it if I export it from dashboard, 
// or I will move CampaignCard to its own file first? 
// Let's create `FundraisingYearGroup` and accept `children` or `renderCampaign` function? 
// No, standard is to pass data. I will extract CampaignCard in the next step or duplicate small part.
// Actually, looking at `campout-year-group.tsx`, it uses `CampoutList`.
// So I should probably make a `CampaignList` or just inline the mapping here.

// I will assume for a clean impl, I should define the props.

interface Campaign {
    id: string
    name: string
    type: string
    status: string
    goal: number
    startDate: Date
    endDate?: Date | null
}

interface FundraisingYearGroupProps {
    year: number
    campaigns: Campaign[]
    defaultOpen?: boolean
    children: React.ReactNode // Pass the grid of cards as children to facilitate composition
}

export function FundraisingYearGroup({ year, campaigns, defaultOpen = false, children }: FundraisingYearGroupProps) {
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
                <Badge variant="secondary" className="ml-2">{campaigns.length}</Badge>
            </button>

            {isOpen && (
                <div className="pl-7">
                    {children}
                </div>
            )}
        </div>
    )
}
