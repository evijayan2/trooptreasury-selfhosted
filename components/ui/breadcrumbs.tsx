"use client"

import { usePathname, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const view = searchParams.get("view")
    const pathSegments = pathname.split("/").filter(segment => segment !== "")
    console.log("Breadcrumbs - Pathname:", pathname)
    console.log("Breadcrumbs - Segments:", pathSegments)

    // Map strict segment names to readable labels
    const segmentLabels: Record<string, string> = {
        dashboard: "Dashboard",
        campouts: "Campouts",
        scouts: "Scouts",
        users: "Users",
        transactions: "Transactions",
        settings: "Settings",
        login: "Logging In...", // Should not see this for long
    }

    // Extract tenant home for the "Home" icon
    const tenantMatch = null
    const homeHref = "/dashboard"

    return (
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center text-sm font-medium text-muted-foreground/60">
            <ol className="flex items-center gap-1.5">
                {/* Home / Dashboard Root */}
                <li className="flex items-center">
                    <Link
                        href={homeHref}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span>Dashboard</span>
                    </Link>
                </li>

                {pathSegments.map((segment, index) => {
                    // Smart filtering for tenant routes
                    if (segment === "dashboard" && index === 0) return null
                    if (index > 0 && pathSegments[index - 1] === "t") return null

                    const href = "/" + pathSegments.slice(0, index + 1).join("/")
                    const isLast = index === pathSegments.length - 1

                    let label = segmentLabels[segment]
                    if (segment === "scouts" && view === "transactions") {
                        label = "Transactions"
                    }

                    if (!label) {
                        if (segment.length > 20 && /\d/.test(segment)) {
                            label = "Details"
                        } else {
                            label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")
                        }
                    }

                    return (
                        <li key={href} className="flex items-center gap-1.5">
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
                            {isLast ? (
                                <span className="text-foreground font-semibold">
                                    {label}
                                </span>
                            ) : (
                                <Link
                                    href={href}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {label}
                                </Link>
                            )}
                        </li>
                    )
                })}
            </ol>
        </nav>
    )
}
