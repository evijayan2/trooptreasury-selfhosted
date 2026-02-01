import { SetupForm } from "@/components/auth/setup-form"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function Page() {
    const userCount = await prisma.user.count()

    if (userCount > 0) {
        redirect("/")
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50 dark:bg-background">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-primary mb-2">TroopTreasury</h1>
                    <p className="text-gray-600">Initial Setup</p>
                </div>
                <SetupForm />
            </div>
        </div>
    )
}
