import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ParentLinkManager } from "@/components/users/parent-link-manager"
import { UserEditDialog } from "@/components/users/user-edit-dialog"
import { UserStatusToggle } from "@/components/users/user-status-toggle"
import { formatDateTimeEST } from "@/lib/utils"
import { Lock } from "lucide-react"
import { UnlockAccountButton } from "@/components/users/unlock-account-button"

export function UserTable({ users, allScouts, slug }: { users: any[], allScouts: any[], slug: string }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Status / Deactivated</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.id} className={!user.isActive ? "bg-gray-50 opacity-75 dark:bg-slate-900/50" : ""}>
                            <TableCell className="font-medium">{user.name || "N/A"}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-500">
                                {formatDateTimeEST(user.createdAt)}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <UserStatusToggle user={user} slug={slug} />
                                </div>
                                {!user.isActive && user.deactivatedAt && (
                                    <span className="text-xs text-red-500 block mt-1">
                                        Since: {formatDateTimeEST(user.deactivatedAt)}
                                    </span>
                                )}
                                {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                                    <div className="flex items-center gap-2 mt-1">
                                        <Lock className="h-3 w-3 text-red-500" />
                                        <span className="text-xs text-red-500">
                                            Locked until {formatDateTimeEST(user.lockedUntil)}
                                        </span>
                                        <UnlockAccountButton userId={user.id} slug={slug} />
                                    </div>
                                )}
                                {user.failedLoginAttempts > 0 && (!user.lockedUntil || new Date(user.lockedUntil) <= new Date()) && (
                                    <span className="text-xs text-orange-500 block mt-1">
                                        Failed attempts: {user.failedLoginAttempts}/5
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <UserEditDialog user={user} allScouts={allScouts} slug={slug} />
                                    {user.role !== 'SCOUT' && (
                                        <ParentLinkManager user={user} allScouts={allScouts} slug={slug} />
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {users.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No users found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
