"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { NotificationType } from "@prisma/client"

export async function fetchNotifications() {
    const session = await auth()
    if (!session?.user?.id) return []

    // Fetch unread notifications + last 10 read notifications
    // Simple approach: get last 50, sort by date desc
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50
        })
        return notifications
    } catch (error) {
        console.error("Failed to fetch notifications:", error)
        return []
    }
}

export async function markAsRead(notificationId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.notification.update({
            where: { id: notificationId, userId: session.user.id },
            data: { read: true }
        })
        revalidatePath("/dashboard") // Global revalidate might be too much, but fine for now
        return { success: true }
    } catch (error) {
        return { error: "Failed to mark as read" }
    }
}

export async function markAllAsRead() {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.notification.updateMany({
            where: { userId: session.user.id, read: false },
            data: { read: true }
        })
        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        return { error: "Failed to mark all as read" }
    }
}

export async function deleteNotification(notificationId: string) {
    const session = await auth()
    if (!session?.user?.id) return { error: "Unauthorized" }

    try {
        await prisma.notification.delete({
            where: { id: notificationId, userId: session.user.id }
        })
        revalidatePath("/dashboard")
        return { success: true }
    } catch (error) {
        return { error: "Failed to delete notification" }
    }
}

// Helper for other actions to easily create notifications
export async function createNotification({
    userId,
    title,
    message,
    type = "INFO",
    link
}: {
    userId: string
    title: string
    message: string
    type?: NotificationType
    link?: string
}) {
    try {
        await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        })
    } catch (error) {
        console.error("Failed to create notification:", error)
    }
}
// Helper to notify all scouts in a troop
export async function notifyTroopScouts(troopId: string, title: string, message: string, link?: string) {
    try {
        const members = await prisma.troopMember.findMany({
            where: {
                troopId,
                role: { in: ['SCOUT', 'PARENT', 'LEADER', 'ADMIN', 'FINANCIER'] } // Notify everyone for now to be safe, or just parents/scouts?
            },
            select: { userId: true }
        })

        if (members.length === 0) return

        await prisma.notification.createMany({
            data: members.map(m => ({
                userId: m.userId,
                title,
                message,
                link,
                type: 'INFO',
                read: false
            }))
        })
    } catch (error) {
        console.error("Failed to notify troop scouts:", error)
    }
}

// Helper to notify only leadership (Admin/Financier)
export async function notifyTroopLeadership(troopId: string, title: string, message: string, link?: string) {
    try {
        const members = await prisma.troopMember.findMany({
            where: {
                troopId,
                role: { in: ['ADMIN', 'FINANCIER'] }
            },
            select: { userId: true }
        })

        if (members.length === 0) return

        await prisma.notification.createMany({
            data: members.map(m => ({
                userId: m.userId,
                title,
                message,
                link,
                type: 'INFO',
                read: false
            }))
        })
    } catch (error) {
        console.error("Failed to notify troop leadership:", error)
    }
}
