'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { checkInVolunteer, checkOutVolunteer } from "@/lib/actions/eagle-project"
import { toast } from "sonner"
import { EagleProjectWorkDay, EagleProjectVolunteer, EagleVolunteerRole } from "@prisma/client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"

interface CheckInFormProps {
    workDay: EagleProjectWorkDay & { project: { title: string }, volunteers?: EagleProjectVolunteer[] }
    token: string
}

export function CheckInForm({ workDay, token }: CheckInFormProps) {
    const [name, setName] = useState("")
    const [role, setRole] = useState<EagleVolunteerRole>(EagleVolunteerRole.REGISTERED_SCOUT)
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleCheckIn(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim()) return

        setIsSubmitting(true)
        const result = await checkInVolunteer(workDay.id, token, name, role)

        if (result.error) {
            toast.error(result.error)
        } else {
            if (result.action === 'check-in') {
                toast.success(`Checked in as ${result.volunteer?.name}`)
                // Optional: Sound effect or visual cue
            } else if (result.action === 'check-out') {
                toast.success(`Checked out ${result.name}! Total hours: ${result.hours}`)
            }
            setName("") // Clear input for next user
        }
        setIsSubmitting(false)
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>{workDay.project.title}</CardTitle>
                <CardDescription>
                    Volunteer Check-in for {format(new Date(workDay.date), 'EEEE, MMMM do')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleCheckIn} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium">Your Name</label>
                        <Input
                            id="name"
                            placeholder="Type your name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoComplete="off"
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Enter your name to Check In or Check Out.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Role</label>
                        <Select value={role} onValueChange={(val) => setRole(val as EagleVolunteerRole)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={EagleVolunteerRole.REGISTERED_SCOUT}>Registered Scout</SelectItem>
                                <SelectItem value={EagleVolunteerRole.REGISTERED_ADULT}>Registered Adult</SelectItem>
                                <SelectItem value={EagleVolunteerRole.OTHER}>Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[0.8rem] text-muted-foreground">
                            Select your role for this project.
                        </p>
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !name.trim()}>
                        {isSubmitting ? "Processing..." : "Check In / Check Out"}
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="text-center text-sm text-muted-foreground flex flex-col gap-2">
                <p>Thank you for volunteering!</p>
                <p className="text-xs opacity-70">
                    If you are already checked in, entering your name again will check you out.
                </p>
            </CardFooter>
        </Card>
    )
}
