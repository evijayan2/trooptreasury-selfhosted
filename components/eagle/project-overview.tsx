'use client'

import { EagleProject } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { toast } from "sonner"
import { closeEagleProject } from "@/lib/actions/eagle-project"
import { useRouter } from "next/navigation"
import { EagleProjectStatus } from "@prisma/client"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ProjectOverviewProps {
    project: EagleProject
    troopSlug: string
}

export function ProjectOverview({ project, troopSlug }: ProjectOverviewProps) {
    const router = useRouter()
    const [isClosing, setIsClosing] = useState(false)
    const [isCloseOpen, setIsCloseOpen] = useState(false)

    async function handleClose() {
        setIsClosing(true)
        const result = await closeEagleProject(troopSlug, project.id)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Project closed successfully")
            setIsCloseOpen(false)
            router.refresh()
        }
        setIsClosing(false)
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input defaultValue={project.title} readOnly />
                    </div>
                    <div className="grid gap-2">
                        <Label>Beneficiary</Label>
                        <Input defaultValue={project.beneficiary || ''} readOnly placeholder="None specified" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea defaultValue={project.description || ''} readOnly className="min-h-[100px]" />
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" disabled>Edit Details (Coming Soon)</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-4">{project.status}</div>
                    <p className="text-sm text-muted-foreground mb-4">
                        {project.status === EagleProjectStatus.OPEN
                            ? "Project is open for new entries."
                            : "Project is closed. No new entries can be added."}
                    </p>

                    {project.status === EagleProjectStatus.OPEN && (
                        <Dialog open={isCloseOpen} onOpenChange={setIsCloseOpen}>
                            <DialogTrigger asChild>
                                <Button variant="destructive" className="w-full">Close Project</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Close Project?</DialogTitle>
                                    <DialogDescription>
                                        This will prevent any further additions of work days or financial entries. You can still generate reports.
                                        This action cannot be easily undone.
                                    </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsCloseOpen(false)}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleClose} disabled={isClosing}>
                                        {isClosing ? "Closing..." : "Confirm Close"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
