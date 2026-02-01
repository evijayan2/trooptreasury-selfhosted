"use client"

import { useActionState, useState } from "react"
import { acceptInvitation } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input" // Corrected import
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

export function InviteForm({ token }: { token: string }) {
    const [state, dispatch, isPending] = useActionState(acceptInvitation, undefined)
    const router = useRouter()

    if (state?.success) {
        setTimeout(() => {
            router.push("/login")
        }, 2000)
    }

    return (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Welcome!</CardTitle>
                <CardDescription>Set your password to activate your account.</CardDescription>
            </CardHeader>
            <form action={dispatch}>
                <CardContent className="space-y-4">
                    <input type="hidden" name="token" value={token} />
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" required />
                        {state?.issues?.fieldErrors?.confirmPassword && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.confirmPassword[0]}</p>
                        )}
                    </div>
                    {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
                    {state?.success && <p className="text-green-600 text-sm">Passsword set! Redirecting to login...</p>}
                </CardContent>
                <CardFooter>
                    <Button type="submit" className="w-full" disabled={isPending || !!state?.success}>
                        {isPending ? "Setting Password..." : "Set Password & Activate"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
