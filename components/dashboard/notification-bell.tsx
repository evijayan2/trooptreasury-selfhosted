"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { fetchNotifications, markAsRead, markAllAsRead, deleteNotification } from "@/app/actions/notifications"
import { PushNotificationManager } from "@/components/users/push-notification-manager"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    type: string
    link: string | null
    read: boolean
    createdAt: Date
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const unreadCount = notifications.filter(n => !n.read).length

    const loadNotifications = async () => {
        setIsLoading(true)
        const data = await fetchNotifications()
        setNotifications(data)
        setIsLoading(false)
    }

    // Load on mount and poll every minute
    useEffect(() => {
        loadNotifications()
        const interval = setInterval(loadNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    // Refresh when opening popover
    useEffect(() => {
        if (isOpen) loadNotifications()
    }, [isOpen])

    const handleMarkRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation() // Prevent link click if clicking the check
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        await markAsRead(id)
    }

    const handleMarkAllRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        await markAllAsRead()
        toast.success("All marked as read")
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setNotifications(prev => prev.filter(n => n.id !== id))
        await deleteNotification(id)
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative shrink-0 text-muted-foreground" title="Notifications">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-background animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between p-4 pb-2">
                    <h4 className="font-semibold leading-none">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" className="h-auto px-2 text-xs" onClick={handleMarkAllRead}>
                            Mark all read
                        </Button>
                    )}
                </div>

                <div className="px-4 pb-2">
                    <PushNotificationManager />
                </div>

                <Separator />

                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No notifications yet.
                        </div>
                    ) : (
                        <div className="grid">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "relative flex flex-col gap-1 p-4 hover:bg-muted/50 transition-colors border-b last:border-0",
                                        !notification.read && "bg-muted/20"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 space-y-1">
                                            <div className="flex items-center gap-2">
                                                {!notification.read && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                                )}
                                                <p className="text-sm font-medium leading-none">
                                                    {notification.title}
                                                </p>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-2">
                                                {notification.message}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => handleMarkRead(notification.id, e)}
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => handleDelete(notification.id, e)}
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(notification.createdAt).toLocaleDateString()}
                                        </span>
                                        {notification.link && (
                                            <Link
                                                href={notification.link}
                                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                                onClick={() => setIsOpen(false)}
                                            >
                                                View details
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    )
}
