import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { PaymentsDueList } from "@/components/dashboard/payments-due-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Tent, DollarSign, Users } from "lucide-react"

export default async function TenantDashboard({ }: {}) {
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user?.id) return null

    const troop = await prisma.troop.findUnique({
        where: { slug }
    })
    if (!troop) notFound()

    // Fetch user's own scout profile in this troop
    const userScout = await prisma.scout.findFirst({
        where: { userId: session.user.id, troopId: troop.id }
    })

    // Fetch scouts linked to this user (as parent), filtered by this troop
    const parentLinks = await prisma.parentScout.findMany({
        where: { parentId: session.user.id },
        include: { scout: true }
    })
    const childScouts = parentLinks
        .map(pl => pl.scout)
        .filter(s => s.troopId === troop.id)

    // Combine for display
    const myScouts = userScout ? [userScout, ...childScouts] : [...childScouts]
    // Remove duplicates if any (though unlikely with proper data)
    const uniqueScouts = Array.from(new Map(myScouts.map(s => [s.id, s])).values())

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-sm sm:text-base text-muted-foreground">Welcome back, {session.user.name}</p>
                </div>
            </div>

            {/* Quick Stats / Balance Cards */}
            {uniqueScouts.length > 0 && (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {uniqueScouts.map(scout => (
                        <Card key={scout.id}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium truncate pr-2">
                                    Balance: {scout.name}
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-xl sm:text-2xl font-bold ${Number(scout.ibaBalance) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                    ${Number(scout.ibaBalance).toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {/* Fallback if no scouts linked */}
            {uniqueScouts.length === 0 && (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">My Account</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">No scout accounts linked.</p>
                        </CardContent>
                    </Card>
                </div>
            )}


            {/* Payments Due Section */}
            <div className="space-y-4">
                <h3 className="text-lg sm:text-xl font-semibold">Payments Due</h3>
                <PaymentsDueList userId={session.user.id} slug={slug} />
            </div>

            {/* Quick Links */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Link href={`/dashboard/campouts`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Tent className="h-5 w-5" /> Campouts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            View upcoming campouts and register.
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/finance`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Finance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            Manage transactions and view reports.
                        </CardContent>
                    </Card>
                </Link>

                <Link href={`/dashboard/users`}>
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Members</CardTitle>
                        </CardHeader>
                        <CardContent>
                            View troop roster and contacts.
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
