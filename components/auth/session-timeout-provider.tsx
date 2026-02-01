"use client"

import * as React from "react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogAction,
} from "@/components/ui/alert-dialog"

// Constants for timeout values
// Constants for timeout values
const WARNING_DURATION_MS = 30 * 1000     // 30 seconds

export function SessionTimeoutProvider({
    children,
    timeoutMinutes = 15 // Default to 15 if not provided
}: {
    children: React.ReactNode,
    timeoutMinutes?: number
}) {
    const { data: session, status } = useSession()

    // Calculate timeout in MS based on prop
    const SESSION_TIMEOUT_MS = timeoutMinutes * 60 * 1000
    const WARNING_THRESHOLD_MS = SESSION_TIMEOUT_MS - WARNING_DURATION_MS
    const router = useRouter()

    // State to control the warning modal
    const [showWarning, setShowWarning] = React.useState(false)
    const [secondsRemaining, setSecondsRemaining] = React.useState(WARNING_DURATION_MS / 1000)

    // Refs to hold timer IDs
    const warningTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    const logoutTimerRef = React.useRef<NodeJS.Timeout | null>(null)
    const countdownTimerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Track last activity time
    const lastActivityRef = React.useRef<number>(Date.now())

    // Function to reset timers on user activity
    const resetTimers = React.useCallback(() => {
        if (status !== "authenticated") return

        const now = Date.now()
        lastActivityRef.current = now

        // If the warning is already shown, we don't auto-dismiss it via mouse movement alone.
        // User must explicitly acknowledge or we can verify if we want to auto-dismiss.
        // Requirement says: "if the user didnt click continue or cancel, the UI will logout automatiocally"
        // This implies explicit action might be needed, BUT standard behavior is usually any activity resets it BEFORE the warning.
        // once warning is shown, usually we need explicit action or we can be generous.
        // Let's stick to: Activity resets the timers IF the warning is NOT yet shown.
        // If warning is shown, we might pause/wait for user input? 
        // Or simpler: any activity resets everything? 
        // Let's assume ANY activity resets everything for better UX, UNLESS the modal is blocking interactions (AlertDialog is modal).
        // Since AlertDialog is a modal, user likely CANNOT interact with the background easily (overlay).
        // So they HAVE to interact with the modal logic.
        // But mousemove might trigger before they hit the modal.

        // DECISION: Only reset timers if warning is NOT shown.
        // If warning IS shown, we wait for user to click "Continue" or "Logout".

        if (showWarning) return

        // Clear existing timers
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)

        // Set new timers
        // Set new timers
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true)
            startCountdown()
        }, WARNING_THRESHOLD_MS)

        logoutTimerRef.current = setTimeout(() => {
            performLogout()
        }, SESSION_TIMEOUT_MS)

    }, [status, showWarning, SESSION_TIMEOUT_MS, WARNING_THRESHOLD_MS])

    const startCountdown = () => {
        setSecondsRemaining(WARNING_DURATION_MS / 1000)

        // Update countdown every second
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

        countdownTimerRef.current = setInterval(() => {
            setSecondsRemaining((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownTimerRef.current!)
                    return 0
                }
                return prev - 1
            })
        }, 1000)
    }

    const performLogout = async () => {
        // Clear all timers
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

        // Sign out
        await signOut({ callbackUrl: "/login" })
    }

    const handleContinue = () => {
        setShowWarning(false)
        if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)

        // Reset timers effectively
        resetTimers()
    }

    // Effect to attach event listeners
    React.useEffect(() => {
        if (status !== "authenticated") return

        // Events to listen for
        const events = ["mousemove", "keydown", "click", "scroll", "touchstart"]

        const handleActivity = () => {
            resetTimers()
        }

        // Attach listeners
        events.forEach((event) => {
            window.addEventListener(event, handleActivity)
        })

        // Initial reset
        resetTimers()

        // Cleanup
        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, handleActivity)
            })
        }
    }, [status, resetTimers])

    // Effect for cleanup on unmount
    React.useEffect(() => {
        return () => {
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
        }
    }, [])

    return (
        <>
            {children}
            <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Session Timeout</AlertDialogTitle>
                        <AlertDialogDescription>
                            Your session is about to expire due to inactivity. You will be logged out in {secondsRemaining} seconds.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {/* We use AlertDialogAction for both because we want to capture the click. 
                            If we use Cancel, it might just close. We want explicit handlers. */}
                        <AlertDialogAction onClick={handleContinue}>
                            Continue Session
                        </AlertDialogAction>
                        {/* We could add a logout button if desired, but requirement just says "continue or cancel" 
                            Implied: Cancel -> Logout? Or Cancel -> Close dialog? 
                            Usually "Cancel" in this context implies "I'm done, log me out".
                        */}
                        <AlertDialogAction
                            onClick={() => performLogout()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
