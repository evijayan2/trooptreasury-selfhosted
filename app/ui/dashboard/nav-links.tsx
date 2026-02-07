"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { Users, Home, TrendingUp, Tent, FileText, Settings, DollarSign, ShoppingBag, CreditCard } from "lucide-react"
import { Permission } from "@/lib/rbac"
import { Role } from "@prisma/client"

interface NavLinksProps {
    role?: Role
    permissions: Permission[]
    scoutId?: string
    slug: string
    onNavigate?: () => void
}

export function NavLinks({ role, permissions, scoutId, slug, onNavigate }: NavLinksProps) {
    const pathname = usePathname()
    const baseUrl = `/dashboard`

    const allLinks: { name: string, href: string, icon: any, permission?: Permission }[] = [
        { name: 'Dashboard', href: baseUrl, icon: Home, permission: 'VIEW_DASHBOARD' },
        { name: 'Scouts', href: `${baseUrl}/scouts`, icon: Users, permission: 'VIEW_SCOUTS' },
        {
            name: (role === 'SCOUT' || role === 'PARENT') ? 'Transactions' : 'Financials',
            href: (role === 'SCOUT' || role === 'PARENT') ? `${baseUrl}/scouts?view=transactions` : `${baseUrl}/finance`,
            icon: DollarSign,
            permission: 'VIEW_TRANSACTIONS'
        },
        { name: 'Fundraising', href: `${baseUrl}/fundraising`, icon: TrendingUp, permission: 'MANAGE_FUNDRAISING' },
        { name: 'Campouts', href: `${baseUrl}/campouts`, icon: Tent, permission: 'VIEW_CAMPOUTS' },
        { name: 'My Fundraising', href: `${baseUrl}/my-fundraising`, icon: ShoppingBag, permission: 'VIEW_FUNDRAISING' },
        { name: 'Reports', href: `${baseUrl}/reports`, icon: FileText, permission: 'VIEW_REPORTS' },
        { name: 'Users', href: `${baseUrl}/users`, icon: Users, permission: 'VIEW_USERS' },
        { name: 'Settings', href: `${baseUrl}/settings`, icon: Settings, permission: 'VIEW_SETTINGS' },
        { name: 'Billing', href: `/dashboard/admin/billing`, icon: CreditCard, permission: 'VIEW_BILLING' },
    ]

    const isHosted = process.env.NEXT_PUBLIC_IS_HOSTED === "true"

    const filteredLinks = allLinks.filter(link => {
        if (link.name === 'Billing' && !isHosted) return false

        if (role === 'ADMIN') return true

        // Hide "Scouts" menu for SCOUT role (they see their own detail page)
        if (role === 'SCOUT' && link.name === 'Scouts') return false

        // Hide "Transactions" menu for PARENT role (they see roster and can click to view transactions)
        if (role === 'PARENT' && link.name === 'Transactions') return false

        if (link.permission) {
            return permissions.includes(link.permission)
        }
        return true
    })

    return (
        <>
            {filteredLinks.map((link) => {
                const LinkIcon = link.icon
                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        onClick={() => onNavigate?.()}
                        className={clsx(
                            "flex h-[48px] grow items-center justify-start gap-2 rounded-md bg-gray-50 p-3 text-sm font-medium hover:bg-primary/10 hover:text-primary dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-primary/20 dark:hover:text-primary md:flex-none md:justify-start md:p-2 md:px-3 transition-colors",
                            {
                                'bg-primary/15 text-primary font-bold dark:bg-primary/20': pathname === link.href,
                            },
                        )}
                    >
                        <LinkIcon className="w-6" />
                        <p className="block">{link.name}</p>
                    </Link>
                )
            })}
        </>
    )
}
