import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export default async function FinanceLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<any>
}) {
    const session = await auth()
    const slug = "troop-1"
    // Basic role check, though middleware might handle it.
    if (!session?.user?.id) redirect("/login")

    // Fetch Troop & Membership for correct role usage
    const troop = await prisma.troop.findUnique({
        where: { slug },
        select: { id: true }
    })

    if (!troop) return <div>Troop not found</div>

    const member = await prisma.troopMember.findUnique({
        where: {
            troopId_userId: {
                troopId: troop.id,
                userId: session.user.id
            }
        },
        select: { role: true }
    })

    const role = member?.role

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
                <p className="text-muted-foreground">
                    Track budget, fundraising, expenses, and scout accounts.
                </p>
            </div>

            <div className="border-b pb-4 overflow-x-auto">
                <nav className="flex space-x-4">
                    <NavLink href={`/dashboard/finance`}>Overview</NavLink>
                    <NavLink href={`/dashboard/finance/budget`}>Budget</NavLink>
                    <NavLink href={`/dashboard/finance/expenses`}>Expenses & Income</NavLink>
                    <NavLink href={`/dashboard/finance/dues`}>Dues</NavLink>
                    {role === 'ADMIN' || role === 'FINANCIER' ? (
                        <NavLink href={`/dashboard/finance/iba-setup`}>IBA Setup</NavLink>
                    ) : null}
                </nav>
            </div>

            {children}
        </div>
    )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="px-3 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
        >
            {children}
        </Link>
    )
}
