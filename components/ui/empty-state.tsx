import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description: string
    children?: React.ReactNode
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    children,
    className
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-2xl bg-muted/5 transition-colors hover:bg-muted/10",
            className
        )}>
            {Icon && (
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted/20 mb-6">
                    <Icon className="w-8 h-8 text-muted-foreground" aria-hidden="true" />
                </div>
            )}
            <h3 className="text-2xl font-semibold text-foreground mb-2">{title}</h3>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8 text-lg">
                {description}
            </p>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    )
}
