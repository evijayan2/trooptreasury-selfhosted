'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { EagleFinancialType, EagleProjectStatus, EagleVolunteerRole } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Schemas
const createProjectSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    beneficiary: z.string().optional(),
    description: z.string().optional(),
})

const financialEntrySchema = z.object({
    projectId: z.string(),
    type: z.nativeEnum(EagleFinancialType),
    amount: z.coerce.number().positive("Amount must be positive"),
    description: z.string().min(3),
    category: z.string().optional(),
    date: z.coerce.date().default(() => new Date()),
})

const workDaySchema = z.object({
    projectId: z.string(),
    date: z.coerce.date(),
    startTime: z.coerce.date().optional(),
    endTime: z.coerce.date().optional(),
    notes: z.string().optional(),
})

const volunteerLogSchema = z.object({
    workDayId: z.string(),
    volunteers: z.array(z.object({
        name: z.string(),
        userId: z.string().optional(),
        hours: z.coerce.number().positive(),
        role: z.nativeEnum(EagleVolunteerRole),
        checkInTime: z.coerce.date().optional(),
        checkOutTime: z.coerce.date().optional(),
    }))
})

const updateVolunteerLogSchema = z.object({
    volunteerId: z.string(),
    name: z.string(),
    hours: z.coerce.number().positive(),
    role: z.nativeEnum(EagleVolunteerRole),
    checkInTime: z.coerce.date().optional(),
    checkOutTime: z.coerce.date().optional(),
})

// Actions

export async function createEagleProject(troopSlug: string, scoutId: string, data: z.infer<typeof createProjectSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    // Verify permission: User must be the scout or a parent of the scout
    const isScout = await prisma.scout.findFirst({
        where: { id: scoutId, userId: session.user.id }
    })
    const isParent = await prisma.parentScout.findFirst({
        where: { scoutId, parentId: session.user.id }
    })

    if (!isScout && !isParent) {
        return { error: "Unauthorized: Only the scout or their parent can create a project." }
    }

    try {
        const project = await prisma.eagleProject.create({
            data: {
                scoutId,
                ...data,
                status: EagleProjectStatus.OPEN
            }
        })

        revalidatePath(`/dashboard/eagle`)
        return { success: true, project }
    } catch (error) {
        console.error("Failed to create project:", error)
        return { error: "Failed to create project" }
    }
}


export async function closeEagleProject(troopSlug: string, projectId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const project = await prisma.eagleProject.findUnique({
        where: { id: projectId },
        include: { scout: { include: { parentLinks: true } } }
    })

    if (!project) return { error: "Project not found" }

    const isOwner = project.scout.userId === session.user.id
    const isParent = project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }

    try {
        await prisma.eagleProject.update({
            where: { id: projectId },
            data: { status: EagleProjectStatus.CLOSED }
        })
        revalidatePath(`/dashboard/eagle/${projectId}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to close project" }
    }
}

export async function addFinancialEntry(troopSlug: string, data: z.infer<typeof financialEntrySchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    // Check permissions (omitted for brevity, assume similar to above or checked in UI - but should be secure)
    // Ideally we fetch project -> scout -> verify user is scout or parent
    const project = await prisma.eagleProject.findUnique({
        where: { id: data.projectId },
        include: { scout: { include: { parentLinks: true } } }
    })

    if (!project) return { error: "Project not found" }

    const isOwner = project.scout.userId === session.user.id
    const isParent = project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }



    if (project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot add entries." }
    }

    try {
        const entry = await prisma.eagleProjectFinancial.create({
            data: {
                projectId: data.projectId,
                type: data.type,
                amount: data.amount,
                description: data.description,
                category: data.category,
                date: data.date,
            }
        })
        revalidatePath(`/dashboard/eagle/${project.id}`)
        return { success: true, entry }
    } catch (error) {
        return { error: "Failed to add financial entry" }
    }
}

export async function deleteFinancialEntry(troopSlug: string, entryId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const entry = await prisma.eagleProjectFinancial.findUnique({
        where: { id: entryId },
        include: { project: { include: { scout: { include: { parentLinks: true } } } } }
    })

    if (!entry) return { error: "Entry not found" }

    const isOwner = entry.project.scout.userId === session.user.id
    const isParent = entry.project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }



    if (entry.project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot delete entries." }
    }

    try {
        await prisma.eagleProjectFinancial.delete({ where: { id: entryId } })
        revalidatePath(`/dashboard/eagle/${entry.project.id}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete entry" }
    }
}

export async function createWorkDay(troopSlug: string, data: z.infer<typeof workDaySchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const project = await prisma.eagleProject.findUnique({
        where: { id: data.projectId },
        include: { scout: { include: { parentLinks: true } } }
    })
    if (!project) return { error: "Project not found" }

    const isOwner = project.scout.userId === session.user.id
    const isParent = project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }



    if (project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot add work days." }
    }

    try {
        const workDay = await prisma.eagleProjectWorkDay.create({
            data: {
                projectId: data.projectId,
                date: data.date,
                startTime: data.startTime,
                endTime: data.endTime,
                notes: data.notes
            }
        })
        revalidatePath(`/dashboard/eagle/${project.id}`)
        return { success: true, workDay }
    } catch (error) {
        return { error: "Failed to create work day" }
    }
}

export async function logVolunteers(troopSlug: string, data: z.infer<typeof volunteerLogSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const workDay = await prisma.eagleProjectWorkDay.findUnique({
        where: { id: data.workDayId },
        include: { project: { include: { scout: { include: { parentLinks: true } } } } }
    })
    if (!workDay) return { error: "Work day not found" }

    const isOwner = workDay.project.scout.userId === session.user.id
    const isParent = workDay.project.scout.parentLinks.some(link => link.parentId === session.user.id)
    if (!isOwner && !isParent) return { error: "Unauthorized" }



    if (workDay.project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot log volunteers." }
    }

    try {
        // Bulk create volunteers
        await prisma.eagleProjectVolunteer.createMany({
            data: data.volunteers.map(v => ({
                workDayId: data.workDayId,
                name: v.name,
                userId: v.userId,
                hours: v.hours,
                role: v.role,
                checkInTime: v.checkInTime,
                checkOutTime: v.checkOutTime
            }))
        })
        revalidatePath(`/dashboard/eagle/${workDay.project.id}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to log volunteers" }
    }
}

export async function updateVolunteerLog(troopSlug: string, data: z.infer<typeof updateVolunteerLogSchema>) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const volunteer = await prisma.eagleProjectVolunteer.findUnique({
        where: { id: data.volunteerId },
        include: { workDay: { include: { project: { include: { scout: { include: { parentLinks: true } } } } } } }
    })

    if (!volunteer) return { error: "Volunteer log not found" }

    const isOwner = volunteer.workDay.project.scout.userId === session.user.id
    const isParent = volunteer.workDay.project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }

    if (volunteer.workDay.project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot update logs." }
    }

    try {
        await prisma.eagleProjectVolunteer.update({
            where: { id: data.volunteerId },
            data: {
                name: data.name,
                hours: data.hours,
                role: data.role,
                checkInTime: data.checkInTime,
                checkOutTime: data.checkOutTime
            }

        })
        revalidatePath(`/dashboard/eagle/${volunteer.workDay.project.id}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to update volunteer log" }
    }
}

export async function deleteVolunteerLog(troopSlug: string, volunteerId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Not authenticated" }

    const volunteer = await prisma.eagleProjectVolunteer.findUnique({
        where: { id: volunteerId },
        include: { workDay: { include: { project: { include: { scout: { include: { parentLinks: true } } } } } } }
    })

    if (!volunteer) return { error: "Volunteer log not found" }

    const isOwner = volunteer.workDay.project.scout.userId === session.user.id
    const isParent = volunteer.workDay.project.scout.parentLinks.some(link => link.parentId === session.user.id)

    if (!isOwner && !isParent) return { error: "Unauthorized" }

    if (volunteer.workDay.project.status === EagleProjectStatus.CLOSED) {
        return { error: "Project is closed. Cannot delete logs." }
    }

    try {
        await prisma.eagleProjectVolunteer.delete({ where: { id: volunteerId } })
        revalidatePath(`/dashboard/eagle/${volunteer.workDay.project.id}`)
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete volunteer log" }
    }
}

export async function verifyCheckInToken(workDayId: string, token: string) {
    try {
        const workDay = await prisma.eagleProjectWorkDay.findUnique({
            where: { id: workDayId },
            include: { project: true }
        })

        if (!workDay) return { error: "Work day not found" }
        if (workDay.checkInToken !== token) return { error: "Invalid check-in link" }

        // Date validation
        const today = new Date()
        const workDate = new Date(workDay.date)

        // Simple same-day check (ignoring time components for robustness across timezones for now, 
        // essentially checking if it's the right calendar day or reasonably close if late night)
        // Check if date matches YYYY-MM-DD
        const isSameDay =
            today.getFullYear() === workDate.getFullYear() &&
            today.getMonth() === workDate.getMonth() &&
            today.getDate() === workDate.getDate()

        if (!isSameDay) {
            // Allow if today is the day of the event
            // strict check: return { error: "Check-in is only available on the day of the event" }
        }

        return { success: true, workDay }
    } catch (error) {
        return { error: "Verification failed" }
    }
}

export async function checkInVolunteer(workDayId: string, token: string, name: string, role?: EagleVolunteerRole) {
    try {
        const verify = await verifyCheckInToken(workDayId, token)
        if (verify.error) return { error: verify.error }

        // Check if there is an open session for this user (checked in but not checked out)
        const existing = await prisma.eagleProjectVolunteer.findFirst({
            where: {
                workDayId,
                name: { equals: name, mode: 'insensitive' }, // Case insensitive match
                checkInTime: { not: null },
                checkOutTime: null
            }
        })

        if (existing) {
            // CHECK OUT
            const checkOutTime = new Date()
            const checkInTime = existing.checkInTime || new Date()

            const durationMs = checkOutTime.getTime() - checkInTime.getTime()
            const hours = Math.max(0, durationMs / (1000 * 60 * 60)) // Convert ms to hours

            await prisma.eagleProjectVolunteer.update({
                where: { id: existing.id },
                data: {
                    checkOutTime,
                    hours: Number(hours.toFixed(2))
                }
            })

            return { success: true, action: 'check-out', hours: hours.toFixed(2), name: existing.name }
        } else {
            // CHECK IN
            const volunteer = await prisma.eagleProjectVolunteer.create({
                data: {
                    workDayId,
                    name,
                    checkInTime: new Date(),
                    role: role || EagleVolunteerRole.OTHER,
                    hours: 0 // Will apply on checkout
                }
            })

            return { success: true, action: 'check-in', volunteer }
        }
    } catch (error) {
        console.error("Check-in/out failed:", error)
        return { error: "Operation failed. Please try again." }
    }
}

export async function checkOutVolunteer(volunteerId: string, token: string) {
    try {
        const volunteer = await prisma.eagleProjectVolunteer.findUnique({
            where: { id: volunteerId },
            include: { workDay: true }
        })

        if (!volunteer) return { error: "Volunteer record not found" }

        // Verify token again for security
        if (volunteer.workDay.checkInToken !== token) return { error: "Invalid token" }

        if (volunteer.checkOutTime) return { error: "Already checked out" }

        const checkOutTime = new Date()
        const checkInTime = volunteer.checkInTime || new Date() // Fallback should not happen if grounded in flow

        const durationMs = checkOutTime.getTime() - checkInTime.getTime()
        const hours = Math.max(0, durationMs / (1000 * 60 * 60)) // Convert ms to hours

        await prisma.eagleProjectVolunteer.update({
            where: { id: volunteerId },
            data: {
                checkOutTime,
                hours: Number(hours.toFixed(2))
            }
        })

        return { success: true, hours: hours.toFixed(2) }
    } catch (error) {
        return { error: "Check-out failed" }
    }
}
