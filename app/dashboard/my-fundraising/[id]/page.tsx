import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { OrderManager } from "@/components/fundraising/OrderManager"
import { EventParticipationManager } from "@/components/fundraising/event-participation-manager"

export default async function ScoutCampaignPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user) return <div>Unauthorized</div>

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // 1. Try to find if the current User is a Scout in THIS troop
    let scout = await prisma.scout.findFirst({
        where: {
            userId: session.user.id,
            troopId: troop.id
        }
    })

    if (!scout) {
        // 2. If not a scout, check if they are a PARENT of a scout in THIS troop
        // We find a link where the parent is the current user, AND the connected scout is in this troop
        const parentLink = await prisma.parentScout.findFirst({
            where: {
                parentId: session.user.id,
                scout: {
                    troopId: troop.id
                }
            },
            include: { scout: true }
        })

        if (parentLink) {
            scout = parentLink.scout
        }
    }

    // Role Check: Strictly speaking, only MEMBERS of the troop should access this.
    // The scout resolution implicitly checks this (you must be a scout or parent of a scout in this troop).
    // But we might want to check TroopMember table to be 100% sure we are not leaking scenarios.
    // However, if you are a Scout in the troop, you ARE a member. If you are a Parent of a Scout in the troop, you are also likely a member.
    // For now, if no scout is resolved, access is denied.

    if (!scout) {
        // Fallback: If maybe they are an ADMIN trying to view this? 
        // Admins might want to view this page for testing? 
        // For "My Fundraising", it implies acting as a scout. Admins without a scout profile cannot participate.
        return <div className="p-6">You must be logged in as a connected Scout or Parent of this troop to participate.</div>
    }

    const campaign = await prisma.fundraisingCampaign.findUnique({
        where: { id },
        include: { products: true }
    })

    if (!campaign || campaign.troopId !== troop.id) notFound()

    if (campaign.type === 'GENERAL') {
        const sale = await prisma.fundraisingSale.findUnique({
            where: { campaignId_scoutId: { campaignId: id, scoutId: scout.id } }
        })
        const volunteer = await prisma.fundraisingVolunteer.findUnique({
            where: { campaignId_scoutId: { campaignId: id, scoutId: scout.id } }
        })

        // Fetch Logs
        const logs = await prisma.fundraisingOrder.findMany({
            where: { campaignId: id, scoutId: scout.id },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        })

        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
                    <p className="text-muted-foreground">{campaign.description || "General Event"}</p>
                </div>
                <EventParticipationManager
                    campaign={{
                        ...campaign,
                        goal: campaign.goal.toString(),
                        ticketPrice: campaign.ticketPrice?.toNumber() ?? 0,
                        volunteerPercentage: campaign.volunteerPercentage?.toNumber() ?? 0,
                    }}
                    salesCount={sale?.quantity || 0}
                    isVolunteering={!!volunteer}
                    scoutId={scout.id}
                    logs={logs.map(l => ({
                        ...l,
                        amountPaid: l.amountPaid.toNumber(),
                        product: l.product ? {
                            ...l.product,
                            price: l.product.price.toNumber(),
                            cost: l.product.cost.toNumber(),
                            ibaAmount: l.product.ibaAmount.toNumber()
                        } : null
                    }))}
                    slug={slug} />
            </div>
        )
    }

    // Default to Product Sale (Orders)
    const orders = await prisma.fundraisingOrder.findMany({
        where: {
            campaignId: id,
            scoutId: scout.id
        },
        include: { product: true },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
                <p className="text-muted-foreground">Manage your sales and participation</p>
            </div>

            <OrderManager
                campaign={{
                    ...campaign,
                    goal: campaign.goal.toNumber(),
                    ticketPrice: campaign.ticketPrice?.toNumber() ?? 0,
                    volunteerPercentage: campaign.volunteerPercentage?.toNumber() ?? 0,
                    ibaPercentage: campaign.ibaPercentage,
                    products: campaign.products.map((p: any) => ({
                        ...p,
                        price: p.price.toNumber(),
                        cost: p.cost.toNumber(),
                        ibaAmount: p.ibaAmount.toNumber()
                    }))
                } as any}
                orders={orders.map(o => ({
                    ...o,
                    amountPaid: o.amountPaid.toString(),
                    product: o.product ? {
                        ...o.product,
                        price: o.product.price.toString(),
                        cost: o.product.cost.toString(),
                        ibaAmount: o.product.ibaAmount.toString()
                    } : null
                }))}
                scoutId={scout.id}
            />
        </div>
    )
}
