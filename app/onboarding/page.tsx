import { auth, signOut } from "@/auth"
import { prisma } from "@/lib/prisma"
import { TroopSettingsForm } from "@/components/settings/troop-settings-form"
import { redirect } from "next/navigation"

export default async function Page() {
    const session = await auth()
    if (!session) {
        redirect("/login")
    }

    const membership = await prisma.troopMember.findFirst({
        where: { userId: session.user.id, role: 'ADMIN' },
        include: { troop: true }
    })

    if (!membership) {
        return <div className="p-6 text-center">No troop found. Please contact an administrator.</div>
    }

    const troop = membership.troop
    const settings = {
        name: troop.name,
        council: troop.council || "",
        district: troop.district || "",
        ...((troop.settings as any) || {})
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-background p-6">
            <div className="w-full max-w-2xl text-center space-y-6">
                <h1 className="text-3xl font-bold tracking-tight">Complete Troop Setup</h1>
                <TroopSettingsForm initialData={settings} slug={troop.slug} className="bg-white dark:bg-card p-6 rounded-lg shadow-md" />
            </div>
        </div>
    )
}
