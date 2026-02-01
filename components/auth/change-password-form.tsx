"use client"

import { useActionState } from "react"
import { changePassword } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function ChangePasswordForm() {
    const [state, dispatch, isPending] = useActionState(changePassword, undefined)

    return (
        <Card>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <CardContent>
                <form action={dispatch} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input id="currentPassword" name="currentPassword" type="password" required />
                        {state?.issues?.fieldErrors?.currentPassword && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.currentPassword[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" name="newPassword" type="password" required />
                        {state?.issues?.fieldErrors?.newPassword && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.newPassword[0]}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" name="confirmPassword" type="password" required />
                        {state?.issues?.fieldErrors?.confirmPassword && (
                            <p className="text-red-500 text-xs">{state.issues.fieldErrors.confirmPassword[0]}</p>
                        )}
                    </div>

                    {state?.error && state.error !== "Invalid fields" && <p className="text-red-500 text-sm">{state.error}</p>}
                    {state?.success && <p className="text-green-500 text-sm">{state.message}</p>}

                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
