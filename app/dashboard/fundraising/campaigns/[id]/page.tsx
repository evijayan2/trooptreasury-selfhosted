import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import { CampaignManager } from "@/components/fundraising/campaign-manager"

export default async function CampaignDetailPage({ params }: { params: Promise<any> }) {
    const { slug, id } = await params
    const session = await auth()

    if (!session?.user?.id) redirect("/login")

    // 1. Fetch Troop Context
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) redirect("/dashboard")

    // 2. Check Permissions
    const member = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })
    const role = member?.role || ""
    if (!["ADMIN", "FINANCIER", "LEADER"].includes(role)) {
        redirect(`/dashboard`)
    }
    const [campaign, troopSettings] = await Promise.all([
        prisma.fundraisingCampaign.findUnique({
            where: { id },
            include: {
                transactions: {
                    orderBy: { createdAt: 'desc' },
                    include: { scout: true }
                },
                sales: { include: { scout: true } },
                volunteers: { include: { scout: true } },
                products: true,
                orders: { include: { product: true, scout: true } },
                directSalesInventory: {
                    include: {
                        product: true,
                        groupItems: true
                    }
                },
                directSalesGroups: {
                    include: {
                        items: {
                            include: {
                                inventory: {
                                    include: { product: true }
                                }
                            }
                        },
                        volunteers: {
                            include: {
                                scout: true,
                                user: true
                            }
                        }
                    }
                }
            }
        }),
        prisma.troopSettings.findFirst()
    ])

    if (!campaign) {
        notFound()
    }

    const scouts = await prisma.scout.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    })

    // Fetch adults for volunteer groups
    const adultsData = await prisma.user.findMany({
        where: {
            troopMemberships: {
                some: {
                    troopId: troop.id,
                    role: { in: ["ADMIN", "FINANCIER", "LEADER", "PARENT"] }
                }
            },
            isActive: true
        },
        select: {
            id: true,
            name: true
        }
    })

    // Filter out users with null names for type safety
    const adults = adultsData
        .filter((u): u is { id: string; name: string } => u.name !== null)
        .map(u => ({ id: u.id, name: u.name }))

    // Header info for exports
    const headerInfo = {
        troopName: troopSettings?.name || "Troop Treasury",
        council: troopSettings?.council || "",
        district: troopSettings?.district || "",
        address: troopSettings?.address || ""
    }

    // Serializing Decimal for Client Component
    const serializedCampaign = {
        ...campaign,
        goal: campaign.goal.toNumber(),
        ticketPrice: campaign.ticketPrice?.toNumber() ?? 0,
        volunteerPercentage: campaign.volunteerPercentage?.toNumber() ?? 0,
        transactions: campaign.transactions.map((t: any) => ({
            ...t,
            amount: t.amount.toNumber(),
            scout: t.scout ? { id: t.scout.id, name: t.scout.name } : null
        })),
        sales: campaign.sales.map((s: any) => ({
            ...s,
            scout: s.scout ? { id: s.scout.id, name: s.scout.name, ibaBalance: s.scout.ibaBalance.toNumber() } : null
        })),
        volunteers: campaign.volunteers.map((v: any) => ({
            ...v,
            scout: v.scout ? { id: v.scout.id, name: v.scout.name, ibaBalance: v.scout.ibaBalance.toNumber() } : null
        })),
        products: campaign.products.map((p: any) => ({
            ...p,
            price: p.price.toNumber(),
            cost: p.cost.toNumber(),
            ibaAmount: p.ibaAmount.toNumber()
        })),
        orders: campaign.orders.map((o: any) => ({
            ...o,
            amountPaid: o.amountPaid.toNumber(),
            scout: o.scout ? { id: o.scout.id, name: o.scout.name, ibaBalance: o.scout.ibaBalance.toNumber() } : null,
            product: o.product ? {
                ...o.product,
                price: o.product.price.toNumber(),
                cost: o.product.cost.toNumber(),
                ibaAmount: o.product.ibaAmount.toNumber()
            } : null
        })),
        directSalesInventory: campaign.directSalesInventory?.map((inv: any) => ({
            ...inv,
            product: inv.product ? {
                ...inv.product,
                price: inv.product.price.toNumber(),
                cost: inv.product.cost.toNumber(),
                ibaAmount: inv.product.ibaAmount.toNumber()
            } : null,
            groups: inv.groups?.map((g: any) => ({
                ...g,
                inventory: {
                    id: inv.id,
                    product: inv.product ? {
                        id: inv.product.id,
                        name: inv.product.name,
                        price: inv.product.price.toNumber(),
                        cost: inv.product.cost.toNumber(),
                        ibaAmount: inv.product.ibaAmount.toNumber()
                    } : null
                },
                volunteers: g.volunteers?.map((v: any) => ({
                    ...v,
                    scout: v.scout ? {
                        id: v.scout.id,
                        name: v.scout.name,
                        ibaBalance: v.scout.ibaBalance.toNumber()
                    } : null,
                    user: v.user ? {
                        id: v.user.id,
                        name: v.user.name
                    } : null
                })) || []
            })) || []
        })) || []
    }

    const isAdmin = ["ADMIN", "FINANCIER"].includes(role)

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <CampaignManager campaign={serializedCampaign} scouts={scouts} headerInfo={headerInfo} adults={adults} isAdmin={isAdmin} />
        </div>
    )
}

