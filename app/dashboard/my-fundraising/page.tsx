
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Package, Gift } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { notFound, redirect } from "next/navigation"

export default async function MyFundraisingPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user) redirect("/login")

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // Check membership? Recommended.
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })
    if (!membership) redirect('/')

    const campaigns = await prisma.fundraisingCampaign.findMany({
        where: {
            status: 'ACTIVE',
            troopId: troop.id
        },
        include: { products: true },
        orderBy: { startDate: 'desc' }
    })

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">My Fundraising</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {campaigns.map(campaign => (
                    <Card key={campaign.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
                                    <div className="flex items-center gap-2">
                                        {campaign.type === 'GENERAL' ? (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Gift className="h-3 w-3" /> Event
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                                <Package className="h-3 w-3" /> Product Sale
                                            </Badge>
                                        )}
                                        <Badge variant="secondary" className="capitalize">{campaign.status.toLowerCase()}</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-between">
                            <div className="text-sm text-muted-foreground space-y-3">
                                {campaign.type === 'PRODUCT_SALE' ? (
                                    <>
                                        {campaign.products.length > 0 ? (
                                            <div className="space-y-1">
                                                <p className="font-medium text-foreground">Products:</p>
                                                <ul className="list-disc list-inside text-xs">
                                                    {campaign.products.slice(0, 3).map(p => (
                                                        <li key={p.id}>
                                                            {p.name} - {formatCurrency(Number(p.price))}
                                                        </li>
                                                    ))}
                                                    {campaign.products.length > 3 && (
                                                        <li className="list-none text-[10px] italic">
                                                            + {campaign.products.length - 3} more products
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="italic">No products configured</p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="line-clamp-2">{campaign.description || "General Fundraising Event"}</p>
                                        {campaign.ticketPrice && (
                                            <p><span className="font-medium text-foreground">Ticket Price:</span> {formatCurrency(Number(campaign.ticketPrice))}</p>
                                        )}
                                        {campaign.volunteerPercentage && Number(campaign.volunteerPercentage) > 0 && (
                                            <div className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-semibold">
                                                Volunteer Bonus: {Number(campaign.volunteerPercentage)}%
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                            <div className="mt-6 pt-4 border-t">
                                <Button asChild variant="outline" className="w-full justify-between">
                                    <Link href={`/dashboard/my-fundraising/${campaign.id}`}>
                                        Manage Fundraising
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {campaigns.length === 0 && (
                <div className="text-center py-16 border-2 border-dashed rounded-xl bg-muted/20">
                    <Package className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No Active Campaigns</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto mt-1">
                        There are currently no active fundraising campaigns to participate in.
                    </p>
                </div>
            )}
        </div>
    )
}
