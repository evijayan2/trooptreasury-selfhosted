import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { CreateCampaignForm } from "@/components/fundraising/create-campaign-form"

import { prisma } from "@/lib/prisma"

export default async function NewCampaignPage({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
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
    if (!["ADMIN", "FINANCIER"].includes(role)) {
        redirect(`/dashboard`)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">New Fundraising Campaign</h1>
                <p className="text-gray-500">Create a new event or product sale.</p>
            </div>
            <CreateCampaignForm slug={slug} />
        </div>
    )
}
