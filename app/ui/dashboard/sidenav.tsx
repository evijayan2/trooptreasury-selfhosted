import Link from "next/link"
import Image from "next/image"
import { Role } from "@prisma/client"
import { Permission } from "@/lib/rbac"
import { NavLinks } from "./nav-links"

interface SideNavProps {
    role?: Role
    permissions: Permission[]
    scoutId?: string
    slug: string
}

export function SideNav({ role, permissions, scoutId, slug }: SideNavProps) {
    return (
        <div className="flex h-full flex-col bg-gray-100/40 dark:bg-gray-800/40 border-r">
            <Link
                className="mb-2 flex h-20 items-end justify-start rounded-md bg-primary p-4 md:h-40"
                href={`/dashboard`}
            >
                <div className="flex w-full items-center justify-start">
                    <Image
                        src="/trooptreasury-logo-main.png"
                        alt="TroopTreasury Logo"
                        width={160}
                        height={160}
                        className="w-full h-auto object-contain"
                        priority
                    />
                </div>
            </Link>
            <div className="flex grow flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto pr-2">
                    <NavLinks role={role} permissions={permissions} scoutId={scoutId} slug={slug} />
                </div>
            </div>
        </div>
    )
}
