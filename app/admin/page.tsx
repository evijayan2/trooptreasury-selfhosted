import { getAdminDashboardStats } from "@/app/actions/admin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, DollarSign, Activity } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboardPage() {
    const stats = await getAdminDashboardStats()

    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    })

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">System Dashboard</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Active Troops</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeSubs + stats.trialingSubs}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats.trialingSubs} in trial
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Rec. Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatter.format(stats.mrr)}</div>
                        <p className="text-xs text-muted-foreground">
                            Estimated (Active + Trialing)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Canceled</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.canceledSubs}</div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime cancellations
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Troops</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTroops}</div>
                        <p className="text-xs text-muted-foreground">
                            Includes canceled/paused
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Recent Signups</h2>
                    <Link href="/admin/subscriptions" className="text-sm text-primary hover:underline">
                        View All
                    </Link>
                </div>

                <Card>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Troop Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Plan</TableHead>
                                    <TableHead>Created</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.recentSignups.map((troop) => (
                                    <TableRow key={troop.id}>
                                        <TableCell className="font-medium">
                                            {troop.name}
                                            <div className="text-xs text-muted-foreground">/dashboard</div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                troop.subscription?.status === 'active' ? 'default' :
                                                    troop.subscription?.status === 'trialing' ? 'secondary' :
                                                        'outline'
                                            }>
                                                {troop.subscription?.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{troop.subscription?.planId ? 'Standard' : 'Free/None'}</TableCell>
                                        <TableCell>{new Date(troop.createdAt).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>
        </div>
    )
}
