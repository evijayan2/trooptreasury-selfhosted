import { InviteForm } from "@/components/auth/invite-form"
import { Suspense } from "react" // Required for useSearchParams equivalent wrapper if we were using it, but purely page props searchParams is async in Next 15, but this is Next 14?? Wait, Next 14 Page props searchParams is valid.
// Wait, for safety with 'use client' components inside, passing searchParams.token is fine.

import { prisma } from "@/lib/prisma"

export default async function InvitePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>
}) {
    const { token } = await searchParams

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-red-500">Invalid invitation link. Token missing.</p>
            </div>
        )
    }

    // Validate token against DB
    const user = await prisma.user.findUnique({
        where: { invitationToken: token }
    })

    if (!user || !user.invitationExpires || user.invitationExpires < new Date()) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-card p-8 rounded-lg shadow-md text-center space-y-4">
                    <h1 className="text-xl font-bold text-red-600">Invitation Expired or Invalid</h1>
                    <p className="text-muted-foreground">
                        This invitation link is no longer valid. It may have expired or already been used.
                    </p>
                    <p>
                        Please ask your administrator to send a new invitation.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-background">
            <InviteForm token={token} />
        </div>
    )
}
