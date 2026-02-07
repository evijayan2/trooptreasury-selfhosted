import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Package, Gift } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { notFound, redirect } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { EmptyState } from "@/components/ui/empty-state"

export default async function MyFundraisingPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user) redirect("/login")

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // Check membership
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
        <div className="max-w-6xl mx-auto space-y-12">
            <PageHeader
                title="My Fundraising"
                description="View and manage active fundraising campaigns for your troop."
            />

            {campaigns.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No Active Campaigns"
                    description="There are currently no active fundraising campaigns to participate in."
                />
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {campaigns.map(campaign => (
                        <Card key={campaign.id} className="flex flex-col border-none shadow-md hover:shadow-lg transition-all rounded-2xl overflow-hidden group">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">{campaign.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {campaign.type === 'GENERAL' ? (
                                                <Badge variant="outline" className="flex items-center gap-1 bg-background">
                                                    <Gift className="h-3 w-3" /> Event
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="flex items-center gap-1 bg-background">
                                                    <Package className="h-3 w-3" /> Product Sale
                                                </Badge>
                                            )}
                                            <Badge variant="secondary" className="capitalize">{campaign.status.toLowerCase()}</Badge>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col justify-between p-6">
                                <div className="text-sm text-muted-foreground space-y-4">
                                    {campaign.type === 'PRODUCT_SALE' ? (
                                        <>
                                            {campaign.products.length > 0 ? (
                                                <div className="space-y-2">
                                                    <p className="font-semibold text-foreground">Featured Products:</p>
                                                    <ul className="space-y-1.5 list-none text-sm">
                                                        {campaign.products.slice(0, 3).map(p => (
                                                            <li key={p.id} className="flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                                                                <span>{p.name} - {formatCurrency(Number(p.price))}</span>
                                                            </li>
                                                        ))}
                                                        {campaign.products.length > 3 && (
                                                            <li className="text-xs italic text-muted-foreground/70 pl-3.5">
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
                                            <p className="line-clamp-3 text-base leading-relaxed">{campaign.description || "General Fundraising Event"}</p>
                                            <div className="pt-2 space-y-2">
                                                {campaign.ticketPrice && (
                                                    <p className="flex items-center justify-between border-b pb-2">
                                                        <span className="font-medium text-foreground">Ticket Price:</span>
                                                        <span className="font-bold text-primary">{formatCurrency(Number(campaign.ticketPrice))}</span>
                                                    </p>
                                                )}
                                                {campaign.volunteerPercentage && Number(campaign.volunteerPercentage) > 0 && (
                                                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold tracking-tight">
                                                        Volunteer Bonus: {Number(campaign.volunteerPercentage)}%
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="mt-8">
                                    <Button asChild className="w-full justify-between rounded-xl h-12 text-base font-semibold shadow-sm transition-all active:scale-95">
                                        <Link href={`/dashboard/my-fundraising/${campaign.id}`}>
                                            Manage My Sales
                                            <ArrowRight className="h-5 w-5" />
                                        </Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
