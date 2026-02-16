import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkAndExpireEvents } from "@/app/actions/scheduler"
import { notFound, redirect } from "next/navigation"
import { CreateProjectDialog } from "@/components/eagle/create-project-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Award, Hammer, Clock } from "lucide-react"

export default async function EagleDashboard({ params }: { params: Promise<any> }) {
    const slug = "troop-1"
    const session = await auth()
    if (!session?.user?.id) redirect(`/login`)

    const troop = await prisma.troop.findUnique({ where: { slug } })
    if (!troop) notFound()

    // Find the user's scout profile or if they are a parent
    const scout = await prisma.scout.findFirst({
        where: { userId: session.user.id, troopId: troop.id }
    })

    // Find parent links
    const parentLinks = await prisma.parentScout.findMany({
        where: { parentId: session.user.id },
        include: { scout: true }
    })

    const relevantScoutIds = []
    if (scout) relevantScoutIds.push(scout.id)
    parentLinks.forEach(pl => {
        if (pl.scout.troopId === troop.id) relevantScoutIds.push(pl.scout.id)
    })

    // Fetch Eagle Projects for these scouts
    const projects = await prisma.eagleProject.findMany({
        where: { scoutId: { in: relevantScoutIds } },
        include: { scout: true }
    })

    // Determine if user can start a project (must be a scout)
    // Parents cannot start a project on behalf of a scout? Or maybe they can?
    // Let's assume only Scout can start for now, or Parent can if they select a scout.
    // For simplicity, let's allow Scout to start.
    const canCreate = !!scout

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Eagle Scout Projects</h2>
                    <p className="text-muted-foreground">Manage your journey to Eagle.</p>
                </div>
                {canCreate && (
                    <CreateProjectDialog troopSlug={slug} scoutId={scout!.id} />
                )}
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No Projects Found</h3>
                    <p className="text-muted-foreground">
                        {canCreate
                            ? "You haven't started an Eagle Scout Project yet."
                            : "No linked scouts have started an Eagle Scout Project."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {projects.map(project => (
                        <Card key={project.id} className="hover:shadow-md transition-shadow">
                            <CardHeader>
                                <CardTitle>{project.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {project.description || "No description provided."}
                                </p>
                                <div className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-1 rounded inline-block mb-4">
                                    {project.status}
                                </div>
                                <div className="flex justify-between items-center text-sm text-muted-foreground mb-4">
                                    <span>{project.scout.name}</span>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href={`/dashboard/eagle/${project.id}`}>
                                        View Project
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
