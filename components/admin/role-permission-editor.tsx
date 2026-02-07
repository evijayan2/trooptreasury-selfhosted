"use client"

import { useActionState, useState, useEffect } from "react"
import { updateRolePermissions } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Permission, DEFAULT_PERMISSIONS } from "@/lib/rbac-shared"
import { Role } from "@prisma/client"
const ALL_PERMISSIONS: Permission[] = [
    "VIEW_DASHBOARD",
    "VIEW_SCOUTS",
    "VIEW_TRANSACTIONS",
    "VIEW_CAMPOUTS",
    "VIEW_REPORTS",
    "VIEW_USERS",
    "VIEW_SETTINGS",
    "MANAGE_SCOUTS",
    "MANAGE_FINANCE",
    "MANAGE_USERS",
    "VIEW_FUNDRAISING",
    "MANAGE_FUNDRAISING",
    "VIEW_BILLING",
    "VIEW_FINANCE_MGMT"
]

const ALL_ROLES: Role[] = ["FINANCIER", "LEADER", "PARENT", "SCOUT" /* Admin is always full access */]

export function RolePermissionEditor({
    initialPermissions,
    slug
}: {
    initialPermissions: Record<Role, Permission[]> | null,
    slug: string
}) {
    const [state, dispatch, isPending] = useActionState(updateRolePermissions, undefined)
    const [permissions, setPermissions] = useState<Record<Role, Permission[]>>(initialPermissions || DEFAULT_PERMISSIONS)

    useEffect(() => {
        if (initialPermissions) {
            setPermissions(initialPermissions)
        }
    }, [initialPermissions])

    const togglePermission = (role: Role, perm: Permission) => {
        setPermissions(prev => {
            const rolePerms = prev[role] || []
            if (rolePerms.includes(perm)) {
                return { ...prev, [role]: rolePerms.filter(p => p !== perm) }
            } else {
                return { ...prev, [role]: [...rolePerms, perm] }
            }
        })
    }

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Customize what each role can see and do.</CardDescription>
            </CardHeader>
            <form action={dispatch}>
                <input type="hidden" name="permissions" value={JSON.stringify(permissions)} />
                <input type="hidden" name="slug" value={slug} />
                <CardContent className="space-y-6">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Permission / Role</th>
                                    {ALL_ROLES.map(role => (
                                        <th key={role} className="px-4 py-2 font-medium text-center">{role}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {ALL_PERMISSIONS.map(perm => (
                                    <tr key={perm} className="hover:bg-muted/50">
                                        <td className="px-4 py-3 font-medium">{perm.replace(/_/g, " ")}</td>
                                        {ALL_ROLES.map(role => {
                                            const active = (permissions[role] || []).includes(perm)
                                            const isForbidden = role === 'SCOUT' && perm === 'VIEW_FINANCE_MGMT'

                                            return (
                                                <td key={`${role}-${perm}`} className="px-4 py-3 text-center">
                                                    {!isForbidden ? (
                                                        <Checkbox
                                                            checked={active}
                                                            onCheckedChange={() => togglePermission(role, perm)}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Restricted</span>
                                                    )}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {state?.error && <p className="text-red-500 text-sm">{state.error}</p>}
                    {state?.success && <p className="text-green-600 text-sm">{state.message}</p>}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={() => setPermissions(DEFAULT_PERMISSIONS)}>
                        Reset to Defaults
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Saving..." : "Save Permissions"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
