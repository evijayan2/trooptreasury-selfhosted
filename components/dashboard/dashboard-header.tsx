"use client"

import { ThemeCustomizer } from "@/components/theme-customizer"
import { Bell, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { signOut } from "next-auth/react"
import { Role } from "@prisma/client"
import { Permission } from "@/lib/rbac"
import { MobileNav } from "@/app/ui/dashboard/mobile-nav"
import { NotificationBell } from "@/components/dashboard/notification-bell"



interface DashboardHeaderProps {
    user: {
        name?: string | null
        email?: string | null
        image?: string | null
        role?: string
    }
    initialColor?: string
    initialTheme?: string
    role?: Role
    permissions?: Permission[]
    scoutId?: string
    slug?: string
    troopName?: string
}

export function DashboardHeader({
    user,
    initialColor,
    initialTheme,
    role,
    permissions,
    scoutId,
    slug,
    troopName
}: DashboardHeaderProps) {
    // Helper to get initials
    const initials = user.name
        ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : "U"

    return (
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between gap-2 sm:gap-4 border-b bg-background px-3 sm:px-4 md:px-6 shadow-sm">
            {/* Left Side: Mobile Menu + Logo + Troop Name + Breadcrumbs */}
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                {/* Mobile Menu Trigger */}
                <div className="md:hidden">
                    <MobileNav
                        role={role}
                        permissions={permissions || []}
                        scoutId={scoutId}
                        initialColor={initialColor || "orange"}
                        initialTheme={initialTheme || "system"}
                        user={user}
                        slug={slug || ""}
                    />
                </div>

                {/* Logo & Troop Name / Switcher */}
                <div className="flex items-center gap-2">
                    {/* Troop Switcher - shows dropdown for users with multiple troops */}
                    <span className="font-bold text-lg hidden sm:inline-block truncate max-w-[200px]">{troopName || "My Troop"}</span>
                </div>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4">
                {/* Notification Icon */}
                {/* Notification Bell (includes push toggle) */}
                <NotificationBell />

                {/* Theme Customizer */}
                <ThemeCustomizer initialColor={initialColor || "orange"} initialTheme={initialTheme || "system"} />

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-full">
                            <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
                                <AvatarImage src={user.image || ""} alt={user.name || ""} />
                                <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {user.email}
                                </p>
                                <p className="text-xs font-bold text-primary uppercase tracking-wider mt-1">
                                    {user.role}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut()}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
