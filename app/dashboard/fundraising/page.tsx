import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { FundraisingDashboard } from "@/components/fundraising/fundraising-dashboard"

export default async function FundraisingPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) redirect("/login")

    // Fetch Troop
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // Verify Role
    const membership = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    // NOTE: This check might be redundant if Layout handles it or if component handles "Unauthorized"
    // Ideally we should just rely on RBAC component checks, but page level guard is good.
    const role = membership?.role || "SCOUT"
    if (!["ADMIN", "FINANCIER", "LEADER"].includes(role)) {
        // Redirect or Show Error? 
        // Leaders can MANAGE_FUNDRAISING in our map.
        // Let's redirect to dashboard if not allowed.
        redirect(`/dashboard`)
    }

    const campaigns = await prisma.fundraisingCampaign.findMany({
        where: { troopId: troop.id },
        orderBy: { startDate: 'desc' }
    })

    // Transform Decimal to number for the client component
    const mappedCampaigns = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        goal: c.goal.toNumber(),
        startDate: c.startDate,
        endDate: c.endDate
    }))

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Fundraising Management</h1>
                <p className="text-gray-500">Manage campaigns, track sales, and distribute funds.</p>
            </div>

            <FundraisingDashboard campaigns={mappedCampaigns} slug={slug} />
        </div>
    )
}
