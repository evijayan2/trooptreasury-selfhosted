import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, MapPin, DollarSign } from "lucide-react"
import Link from "next/link"
import { formatCurrency, formatDateEST } from "@/lib/utils"

export function CampoutList({ campouts, slug }: { campouts: any[], slug: string }) {
    if (campouts.length === 0) {
        return <div className="text-center text-gray-500 py-8">No campouts scheduled.</div>
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {campouts.map((campout) => (
                <Link href={`/dashboard/campouts/${campout.id}`} key={campout.id} className="block group">
                    <Card className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                                    {campout.name}
                                </CardTitle>
                                <Badge variant={
                                    campout.status === "OPEN" ? "default" :
                                        campout.status === "READY_FOR_PAYMENT" ? "secondary" :
                                            campout.status === "DRAFT" ? "outline" : "destructive" // Closed as destructive or outline
                                }>
                                    {campout.status.replace(/_/g, " ")}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                {campout.location}
                            </div>
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4" />
                                {formatDateEST(campout.startDate)} - {formatDateEST(campout.endDate)}
                            </div>
                            <div className="flex items-center gap-2 font-medium text-gray-900">
                                <DollarSign className="w-4 h-4 text-gray-500" />
                                Est. {formatCurrency(Number(campout.estimatedCost))}
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )
}
