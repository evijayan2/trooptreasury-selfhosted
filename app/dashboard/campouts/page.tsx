import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CampoutList } from "@/components/campouts/campout-list"
import { CampoutForm } from "@/components/campouts/campout-form"
import { CampoutYearGroup } from "@/components/campouts/campout-year-group"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { notFound, redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) redirect("/login")

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    const role = membership?.role || "SCOUT"
    const canEdit = ["ADMIN", "FINANCIER", "LEADER"].includes(role)

    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() // 0-11
    const isDecember = currentMonth === 11

    // Fetch all campouts, sorted by date descending
    const rawCampouts = await prisma.campout.findMany({
        where: { troopId: troop.id },
        orderBy: { startDate: 'desc' },
    })

    const allCampouts = rawCampouts.map(campout => ({
        ...campout,
        estimatedCost: Number(campout.estimatedCost)
    }))

    // Group campouts by year
    const campoutsByYear: Record<number, typeof allCampouts> = {}
    allCampouts.forEach(campout => {
        const year = new Date(campout.startDate).getFullYear()
        if (!campoutsByYear[year]) {
            campoutsByYear[year] = []
        }
        campoutsByYear[year].push(campout)
    })

    // Get years and sort them according to custom logic
    const sortedYears = Object.keys(campoutsByYear)
        .map(Number)
        .sort((a, b) => {
            const getSortWeight = (year: number) => {
                if (year === currentYear) return 100000
                if (isDecember && year === currentYear + 1) return 90000
                if (year === currentYear - 1) return -100000 // Display past 1 year at last
                return year // Others sorted by year (effectively desc)
            }
            return getSortWeight(b) - getSortWeight(a)
        })

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold">Campout Management</h1>
                    <p className="text-gray-500">Plan and manage upcoming troop campouts and events.</p>
                </div>
                <div className="flex items-center gap-4">
                    {canEdit && (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Schedule Campout</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Schedule Campout</DialogTitle>
                                    <DialogDescription>
                                        Plan a new upcoming campout.
                                    </DialogDescription>
                                </DialogHeader>
                                <CampoutForm slug={slug} />
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {sortedYears.length === 0 ? (
                <div className="text-center text-gray-500 py-8">No campouts scheduled.</div>
            ) : (
                sortedYears.map(year => {
                    // Logic for default expanded state:
                    // - Current Year: Expanded
                    // - Next Year (Near Future): Expanded
                    // - Last Year (Near Past): Expanded
                    // - All others: Collapsed
                    const isDefaultOpen =
                        year === currentYear ||
                        year === currentYear + 1 ||
                        year === currentYear - 1

                    return (
                        <CampoutYearGroup
                            key={year}
                            year={year}
                            campouts={campoutsByYear[year]}
                            defaultOpen={isDefaultOpen}
                            slug={slug}
                        />
                    )
                })
            )}
        </div>
    )
}
