'use client'

import { EagleProjectWorkDay, EagleProjectVolunteer, EagleVolunteerRole, EagleProjectStatus } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus, Users, QrCode, Pencil, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createWorkDay, logVolunteers, updateVolunteerLog, deleteVolunteerLog } from "@/lib/actions/eagle-project"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WorkDayWithVolunteers = EagleProjectWorkDay & { volunteers: EagleProjectVolunteer[] }

interface VolunteerLogProps {
    projectId: string
    workDays: WorkDayWithVolunteers[]

    troopSlug: string
    projectStatus: EagleProjectStatus
}

export function VolunteerLog({ projectId, workDays, troopSlug, projectStatus }: VolunteerLogProps) {
    const [openWorkDay, setOpenWorkDay] = useState(false)
    const [openLog, setOpenLog] = useState(false)
    const [selectedWorkDayId, setSelectedWorkDayId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [checkIn, setCheckIn] = useState("")
    const [checkOut, setCheckOut] = useState("")
    const [hours, setHours] = useState("")
    const [editingVolunteer, setEditingVolunteer] = useState<EagleProjectVolunteer | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    useEffect(() => {
        if (checkIn && checkOut) {
            const date = new Date().toISOString().split('T')[0]
            const start = new Date(`${date}T${checkIn}`)
            const end = new Date(`${date}T${checkOut}`)
            let diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60)

            if (diff < 0) {
                diff += 24
            }

            if (diff > 0) {
                setHours(diff.toFixed(2))
            }
        }
    }, [checkIn, checkOut])

    useEffect(() => {
        if (!openLog) {
            setCheckIn("")
            setCheckOut("")
            setHours("")
        }
    }, [openLog])
    const router = useRouter()

    const totalHours = workDays.reduce((acc, day) =>
        acc + day.volunteers.reduce((vAcc, v) => vAcc + Number(v.hours), 0)
        , 0)

    async function handleAddWorkDay(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const result = await createWorkDay(troopSlug, {
            projectId,
            date: new Date(formData.get('date') as string),
            startTime: formData.get('startTime') ? new Date(`${formData.get('date')}T${formData.get('startTime')}`) : undefined,
            endTime: formData.get('endTime') ? new Date(`${formData.get('date')}T${formData.get('endTime')}`) : undefined,
            notes: formData.get('notes') as string
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Work Day created")
            setOpenWorkDay(false)
            router.refresh()
        }
        setIsSubmitting(false)
    }

    async function handleLogVolunteer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!selectedWorkDayId) return
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const currentWorkDay = workDays.find(d => d.id === selectedWorkDayId)
        const dateStr = currentWorkDay ? format(new Date(currentWorkDay.date), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]

        const checkInTime = formData.get('checkInTime') as string
        const checkOutTime = formData.get('checkOutTime') as string

        // Simple single entry for now, can be expanded to bulk
        const result = await logVolunteers(troopSlug, {
            workDayId: selectedWorkDayId,
            volunteers: [{
                name: formData.get('name') as string,
                role: formData.get('role') as EagleVolunteerRole,
                hours: Number(formData.get('hours')),
                checkInTime: checkInTime ? new Date(`${dateStr}T${checkInTime}`) : undefined,
                checkOutTime: checkOutTime ? new Date(`${dateStr}T${checkOutTime}`) : undefined,
            }]
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Volunteer logged")
            setOpenLog(false)
            router.refresh()
        }
        setIsSubmitting(false)
    }

    async function handleUpdateVolunteer(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!editingVolunteer) return
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const currentWorkDay = workDays.find(d => d.id === editingVolunteer.workDayId)
        const dateStr = currentWorkDay ? format(new Date(currentWorkDay.date), 'yyyy-MM-dd') : new Date().toISOString().split('T')[0]

        const checkInTime = formData.get('checkInTime') as string
        const checkOutTime = formData.get('checkOutTime') as string

        const result = await updateVolunteerLog(troopSlug, {
            volunteerId: editingVolunteer.id,
            name: formData.get('name') as string,
            role: formData.get('role') as EagleVolunteerRole,
            hours: Number(formData.get('hours')),
            checkInTime: checkInTime ? new Date(`${dateStr}T${checkInTime}`) : undefined,
            checkOutTime: checkOutTime ? new Date(`${dateStr}T${checkOutTime}`) : undefined,
        })

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Volunteer updated")
            setEditingVolunteer(null)
            router.refresh()
        }
        setIsSubmitting(false)
    }

    async function handleDeleteVolunteer(volunteerId: string) {
        if (!confirm("Are you sure you want to delete this entry?")) return
        const result = await deleteVolunteerLog(troopSlug, volunteerId)
        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success("Volunteer entry deleted")
            router.refresh()
        }
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Project Hours</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{totalHours.toFixed(1)}</div></CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Work Days</CardTitle>
                        <CardDescription>Manage work sessions and sign-in sheets.</CardDescription>
                    </div>

                    {projectStatus === EagleProjectStatus.OPEN && (
                        <Dialog open={openWorkDay} onOpenChange={setOpenWorkDay}>
                            <DialogTrigger asChild>
                                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Schedule Work Day</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>New Work Day</DialogTitle></DialogHeader>
                                <form onSubmit={handleAddWorkDay} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label>Date</Label>
                                        <Input name="date" type="date" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Start Time</Label>
                                            <Input name="startTime" type="time" />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>End Time</Label>
                                            <Input name="endTime" type="time" />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Notes</Label>
                                        <Textarea name="notes" placeholder="Plan for the day..." />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmitting}>Create</Button>
                                    </DialogFooter>
                                </form>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {workDays.length === 0 && <p className="text-center text-muted-foreground py-4">No work days recorded.</p>}
                        {workDays.map(day => (
                            <div key={day.id} className="border rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="font-semibold text-lg">{format(new Date(day.date), 'EEEE, MMM d, yyyy')}</h4>
                                        {day.startTime && day.endTime && (
                                            <p className="text-sm text-muted-foreground">
                                                {format(new Date(day.startTime), 'h:mm a')} - {format(new Date(day.endTime), 'h:mm a')}
                                            </p>
                                        )}
                                        {day.notes && <p className="text-sm mt-1">{day.notes}</p>}
                                    </div>
                                    <div className="flex items-center">
                                        {projectStatus === EagleProjectStatus.OPEN && (
                                            <>
                                                <Dialog open={openLog && selectedWorkDayId === day.id} onOpenChange={(open) => {
                                                    setOpenLog(open)
                                                    if (!open) setSelectedWorkDayId(null)
                                                    else setSelectedWorkDayId(day.id)
                                                }}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" onClick={() => setSelectedWorkDayId(day.id)}>
                                                            <Users className="h-4 w-4 mr-2" /> Log Volunteers
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Log Volunteer Hours</DialogTitle></DialogHeader>
                                                        <form onSubmit={handleLogVolunteer} className="space-y-4">
                                                            <div className="grid gap-2">
                                                                <Label>Volunteer Name</Label>
                                                                <Input name="name" placeholder="Name" required />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label>Role</Label>
                                                                <Select name="role" defaultValue="OTHER">
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="REGISTERED_SCOUT">Registered Scout</SelectItem>
                                                                        <SelectItem value="REGISTERED_ADULT">Registered Adult</SelectItem>
                                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="grid gap-2">
                                                                    <Label>Check-in Time</Label>
                                                                    <Input
                                                                        name="checkInTime"
                                                                        type="time"
                                                                        value={checkIn}
                                                                        onChange={(e) => setCheckIn(e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>Check-out Time</Label>
                                                                    <Input
                                                                        name="checkOutTime"
                                                                        type="time"
                                                                        value={checkOut}
                                                                        onChange={(e) => setCheckOut(e.target.value)}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label>Hours</Label>
                                                                <Input
                                                                    name="hours"
                                                                    type="number"
                                                                    step="0.1"
                                                                    required
                                                                    value={hours}
                                                                    onChange={(e) => setHours(e.target.value)}
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button type="submit" disabled={isSubmitting}>Add Log</Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>

                                                <Dialog open={!!editingVolunteer && editingVolunteer?.workDayId === day.id} onOpenChange={(open) => !open && setEditingVolunteer(null)}>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Edit Volunteer Log</DialogTitle></DialogHeader>
                                                        <form onSubmit={handleUpdateVolunteer} className="space-y-4">
                                                            <div className="grid gap-2">
                                                                <Label>Volunteer Name</Label>
                                                                <Input name="name" defaultValue={editingVolunteer?.name} required />
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label>Role</Label>
                                                                <Select name="role" defaultValue={editingVolunteer?.role}>
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="REGISTERED_SCOUT">Registered Scout</SelectItem>
                                                                        <SelectItem value="REGISTERED_ADULT">Registered Adult</SelectItem>
                                                                        <SelectItem value="OTHER">Other</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="grid gap-2">
                                                                    <Label>Check-in Time</Label>
                                                                    <Input
                                                                        name="checkInTime"
                                                                        type="time"
                                                                        defaultValue={editingVolunteer?.checkInTime ? format(new Date(editingVolunteer.checkInTime), 'HH:mm') : ''}
                                                                    />
                                                                </div>
                                                                <div className="grid gap-2">
                                                                    <Label>Check-out Time</Label>
                                                                    <Input
                                                                        name="checkOutTime"
                                                                        type="time"
                                                                        defaultValue={editingVolunteer?.checkOutTime ? format(new Date(editingVolunteer.checkOutTime), 'HH:mm') : ''}
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div className="grid gap-2">
                                                                <Label>Hours</Label>
                                                                <Input
                                                                    name="hours"
                                                                    type="number"
                                                                    step="0.1"
                                                                    required
                                                                    defaultValue={Number(editingVolunteer?.hours)}
                                                                />
                                                            </div>
                                                            <DialogFooter>
                                                                <Button type="submit" disabled={isSubmitting}>Update Log</Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </>
                                        )}

                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="outline" size="sm" className="ml-2">
                                                    <QrCode className="h-4 w-4 mr-2" /> Check-in QR
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Volunteer Check-in QR Code</DialogTitle>
                                                </DialogHeader>
                                                <div className="flex flex-col items-center justify-center p-6 space-y-4">
                                                    <div className="bg-white p-4 rounded-lg">
                                                        <QRCodeSVG
                                                            value={`${window.location.origin}/eagle-checkin/${day.id}?token=${day.checkInToken}`}
                                                            size={256}
                                                            level="H"
                                                        />
                                                    </div>
                                                    <p className="text-sm text-center text-muted-foreground">
                                                        Scan to check in/out for {format(new Date(day.date), 'MMM d')}
                                                    </p>
                                                    <p className="text-xs text-center break-all text-muted-foreground">
                                                        {`${window.location.origin}/eagle-checkin/${day.id}?token=${day.checkInToken}`}
                                                    </p>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Volunteer</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead className="text-right">Hours</TableHead>
                                            {projectStatus === EagleProjectStatus.OPEN && <TableHead className="w-[100px]"></TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {day.volunteers.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={projectStatus === EagleProjectStatus.OPEN ? 4 : 3} className="text-center text-muted-foreground text-sm">No volunteers logged yet.</TableCell>
                                            </TableRow>
                                        )}
                                        {day.volunteers.map(v => (
                                            <TableRow key={v.id}>
                                                <TableCell>{v.name}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">{v.role.replace('_', ' ')}</TableCell>
                                                <TableCell className="text-right">
                                                    {Number(v.hours).toFixed(1)}
                                                    {v.checkInTime && v.checkOutTime && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {format(new Date(v.checkInTime), 'h:mm a')} - {format(new Date(v.checkOutTime), 'h:mm a')}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {projectStatus === EagleProjectStatus.OPEN && (
                                                    <TableCell className="w-[100px] text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingVolunteer(v)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive"
                                                                onClick={() => handleDeleteVolunteer(v.id)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}
