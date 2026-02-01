"use client"

import { toast } from "sonner"
import { createNotification } from "@/app/actions/notifications"
import { NotificationType } from "@prisma/client"

type ToastType = "success" | "error" | "info" | "warning"

interface NotifyOptions {
    userId: string
    title: string
    message: string
    type?: ToastType
    link?: string
}

/**
 * Utility to show a toast AND create a persistent notification log.
 * Use this for system events that should be recorded.
 */
export async function notifyWithLog({ userId, title, message, type = "info", link }: NotifyOptions) {
    // 1. Show appropriate toast
    switch (type) {
        case "success":
            toast.success(message)
            break
        case "error":
            toast.error(message)
            break
        case "warning":
            toast.warning(message)
            break
        default:
            toast.info(message)
    }

    // 2. Map Toast Notification Type to DB Notification Type
    let dbType: NotificationType = "INFO"
    if (type === "error") dbType = "ALERT"
    if (type === "warning") dbType = "ACTION_REQUIRED"
    if (type === "success") dbType = "SYSTEM"

    // 3. Create persistent notification in background
    // We don't await this to avoid blocking UI interaction
    createNotification({
        userId,
        title,
        message,
        type: dbType,
        link
    })
}
