import { auth } from "@/auth"
import { ChangePasswordForm } from "@/components/auth/change-password-form"
import { TroopSettingsForm } from "@/components/settings/troop-settings-form"
import { prisma } from "@/lib/prisma"
import { RolePermissionEditor } from "@/components/admin/role-permission-editor"
import { ResetDatabaseCard } from "@/components/settings/reset-database-card"
import { ExportDbButton } from "@/components/settings/export-db-button"

export default async function Page({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()

    if (!session?.user?.id) return null

    // Fetch Troop and Role
    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) return <div>Troop not found</div>

    const member = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        }
    })

    const role = member?.role



    const serializedSettings = {
        name: troop.name,
        council: troop.council || "",
        district: troop.district || "",
        ...((troop.settings as any) || {})
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Settings</h1>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-6">
                    <ChangePasswordForm />
                </div>

                {role === 'ADMIN' && (
                    <div className="md:col-span-1 lg:col-span-2 space-y-6">
                        <TroopSettingsForm initialData={serializedSettings} slug={slug} className="h-fit" />
                    </div>
                )}
            </div>

            {role === 'ADMIN' && (
                <div className="space-y-6">
                    <RolePermissionEditor
                        initialPermissions={(troop.settings as any)?.rolePermissions || null}
                        slug={slug}
                    />
                    <ResetDatabaseCard />
                    <ExportDbButton />
                </div>
            )}
        </div>
    )
}
