"use client"

import { useState, useEffect } from 'react'
import { updatePushToken } from '@/app/actions/user'
import { NEXT_PUBLIC_VAPID_PUBLIC_KEY } from '@/lib/push-config'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}

export function PushNotificationManager() {
    const [isSupported, setIsSupported] = useState(false)
    const [subscription, setSubscription] = useState<PushSubscription | null>(null)

    useEffect(() => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true)
            registerServiceWorker()
        }
    }, [])

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js', {
                scope: '/',
                updateViaCache: 'none',
            })
            const sub = await registration.pushManager.getSubscription()
            setSubscription(sub)
        } catch {
            // Silently fail if SW is blocked or not served correctly
        }
    }

    async function subscribeToPush() {
        try {
            const registration = await navigator.serviceWorker.ready
            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY)
            })
            const result = await updatePushToken(JSON.stringify(sub))
            if (result?.error) {
                toast.error("Failed to save push token to server")
            } else {
                setSubscription(sub)
                toast.success("Notifications enabled!")
            }
        } catch (e: any) {
            console.error("Failed to subscribe:", e)
            toast.error(`Failed to enable notifications: ${e.message || "Unknown error"}`)
        }
    }

    if (!isSupported) {
        return null // or return <p>Push notifications not supported</p>
    }

    if (subscription) {
        // Already subscribed
        return null
        // Optional: Return a small "Notifications Active" badge or button to Unsubscribe
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={subscribeToPush}
            className="gap-2"
        >
            <Bell className="h-4 w-4" />
            Enable Notifications
        </Button>
    )
}
