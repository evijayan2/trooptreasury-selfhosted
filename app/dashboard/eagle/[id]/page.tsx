import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
// Components to be created
import { FinancialTracker } from "@/components/eagle/financial-tracker"
import { VolunteerLog } from "@/components/eagle/volunteer-log"
import { ProjectOverview } from "@/components/eagle/project-overview"

export default async function ProjectDetailsPage({ params }: { params: Promise<any> }) {
    const { slug, id } = await params
    const session = await auth()
    if (!session?.user?.id) redirect(`/login`)

    const project = await prisma.eagleProject.findUnique({
        where: { id },
        include: {
            scout: true,
            financials: { orderBy: { date: 'desc' } },
            workDays: {
                include: { volunteers: true },
                orderBy: { date: 'desc' }
            }
        }
    })

    if (!project) notFound()

    // Permissions Check
    // Scout/Parent: Full Access
    // Others: Limited View (Volunteer Log only?) or maybe just deny for now based on user request.
    // User said: "other scout cant see the projects, we can expand this feature to others for volunteer signups."
    // So if not owner/parent, deny access or show restricted view.

    const isOwner = project.scout.userId === session.user.id
    // Check parent
    const parentLink = await prisma.parentScout.findUnique({
        where: {
            parentId_scoutId: {
                parentId: session.user.id,
                scoutId: project.scoutId
            }
        }
    })
    const isParent = !!parentLink

    if (!isOwner && !isParent) {
        // Check if admin? For now let's strict block as requested, or maybe allow if admin.
        // simpler: just block for now.
        return (
            <div className="p-8 text-center text-destructive">
                <h2 className="text-2xl font-bold">Unauthorized</h2>
                <p>You do not have permission to view this project.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{project.title}</h2>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <span>{project.scout.name}</span>
                        <span>•</span>
                        <Badge variant="outline">{project.status}</Badge>
                    </div>
                </div>
                {/* Actions like Edit Project Details could go here */}
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="financials">Financials & Materials</TabsTrigger>
                    <TabsTrigger value="volunteers">Volunteer Log</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <ProjectOverview project={project} troopSlug={slug} />
                </TabsContent>

                <TabsContent value="financials" className="space-y-4">
                    <FinancialTracker
                        projectId={project.id}
                        initialData={project.financials}
                        troopSlug={slug}
                        projectStatus={project.status}
                    />
                </TabsContent>

                <TabsContent value="volunteers" className="space-y-4">
                    <VolunteerLog
                        projectId={project.id}
                        workDays={project.workDays}
                        troopSlug={slug}
                        projectStatus={project.status}
                    />
                </TabsContent>

                <TabsContent value="reports" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Project Reports</CardTitle>
                            <CardDescription>Export your data for the Eagle Scout Service Project Workbook.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Reporting functionality coming soon.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
