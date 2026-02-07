import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    children?: React.ReactNode
    className?: string
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8", className)}>
            <div className="space-y-1">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
                {description && (
                    <p className="text-lg text-muted-foreground">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-3">
                    {children}
                </div>
            )}
        </div>
    )
}
