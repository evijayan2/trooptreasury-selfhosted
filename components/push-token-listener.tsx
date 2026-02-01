'use client'

import { updatePushToken } from "@/app/actions/user"
import { useEffect } from "react"

export function PushTokenListener() {
    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            try {
                // Verify source if possible, though for WebView it's essentially window-level
                if (!event.data) return

                let data
                try {
                    data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
                } catch (e) {
                    // Not JSON
                    return
                }

                if (data?.type === 'PUSH_TOKEN' && data?.token) {
                    console.log("Received Push Token from WebView:", data.token)
                    const result = await updatePushToken(data.token)
                    if (result.success) {
                        console.log("Push token saved to profile")
                    } else {
                        console.error("Failed to save push token:", result.error)
                    }
                }
            } catch (error) {
                console.error("Error processing webview message:", error)
            }
        }

        // iOS/Android WebView often communicates via document or window
        // React Native WebView 'injectJavaScript' executes in global scope.
        // window.postMessage in RNWebView triggers the 'message' event on window (or document)

        window.addEventListener("message", handleMessage)

        // Also check if one was sent before hydration? 
        // Usually the app loads -> injects JS -> sends message. 
        // If the app is already loaded, it sends immediately.

        return () => {
            window.removeEventListener("message", handleMessage)
        }
    }, [])

    return null
}
