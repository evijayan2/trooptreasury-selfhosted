import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { signOut } from "@/auth"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default async function PlatformAdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()

    if (!session?.user?.id) {
        redirect("/login?callbackUrl=/admin")
    }

    // Check for PLATFORM_ADMIN role on the USER directly (global role)
    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    })

    const isPlatformAdmin = (user as any)?.role === "PLATFORM_ADMIN"

    if (!isPlatformAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
                <p>You do not have platform administrator privileges.</p>
                <Link href="/" className="underline">Go Home</Link>
            </div>
        )
    }

    const navLinks = [
        { href: "/admin", label: "Dashboard" },
        { href: "/admin/subscriptions", label: "Subscriptions" },
        { href: "/admin/transactions", label: "Transactions" },
        { href: "/admin/coupons", label: "Coupons" },
        { href: "/admin/webhooks", label: "Webhooks" },
    ]

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
                <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
                    <div className="flex items-center gap-6">
                        <Link href="/admin" className="font-bold text-lg flex items-center shrink-0">
                            TroopTreasury<span className="text-primary ml-1">Admin</span>
                        </Link>

                        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                            {navLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground hover:text-primary transition-colors"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-4">
                            <form action={async () => {
                                "use server"
                                await signOut()
                            }}>
                                <Button variant="ghost" size="sm" type="submit">
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Sign Out
                                </Button>
                            </form>
                        </div>

                        {/* Mobile Menu */}
                        <div className="md:hidden">
                            <MobileAdminNav navLinks={navLinks} />
                        </div>
                    </div>
                </div>
            </header>
            <main className="container py-6 px-4 sm:px-8">
                {children}
            </main>
        </div>
    )
}

import { Menu } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"

function MobileAdminNav({ navLinks }: { navLinks: { href: string, label: string }[] }) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
                <SheetHeader className="text-left mb-6">
                    <SheetTitle>Admin Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-4">
                    {navLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-lg font-medium hover:text-primary"
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="pt-4 mt-4 border-t">
                        <form action={async () => {
                            "use server"
                            await signOut()
                        }}>
                            <Button variant="ghost" className="w-full justify-start px-0 text-destructive" type="submit">
                                <LogOut className="h-5 w-5 mr-3" />
                                Sign Out
                            </Button>
                        </form>
                    </div>
                </nav>
            </SheetContent>
        </Sheet>
    )
}
