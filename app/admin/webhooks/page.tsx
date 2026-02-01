
import { getWebhooks } from "@/app/actions/admin"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

export default async function WebhooksPage({
    searchParams
}: {
    searchParams: Promise<{ page?: string; status?: string }>
}) {
    const params = await searchParams
    const page = Number(params.page) || 1
    const status = params.status || ""

    const { events, total, pages } = await getWebhooks({ page, status })

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold">Webhook Monitor</h1>
            </div>

            <Card className="border rounded-md overflow-hidden">
                <div className="overflow-x-auto bg-background">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[150px]">Event Type</TableHead>
                                <TableHead className="min-w-[150px]">Troop</TableHead>
                                <TableHead className="min-w-[150px]">Created At</TableHead>
                                <TableHead className="min-w-[100px]">Status</TableHead>
                                <TableHead className="min-w-[120px]">Processing</TableHead>
                                <TableHead className="min-w-[80px]">Retries</TableHead>
                                <TableHead className="text-right min-w-[150px]">Payload</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {events.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                                        No logged webhooks found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {events.map((event) => (
                                <TableRow key={event.id}>
                                    <TableCell className="font-mono text-[10px] whitespace-nowrap">
                                        {event.eventType}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">
                                        {(event as any).troopName || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm whitespace-nowrap">
                                        {event.createdAt.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={event.processed ? 'default' : event.error ? 'destructive' : 'secondary'}>
                                            {event.processed ? 'Success' : event.error ? 'Failed' : 'Pending'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {event.processedAt ?
                                            `${(event.processedAt.getTime() - event.createdAt.getTime())}ms` :
                                            '-'
                                        }
                                    </TableCell>
                                    <TableCell>{event.retryCount}</TableCell>
                                    <TableCell className="text-right items-center">
                                        <span className="text-[10px] text-muted-foreground font-mono">
                                            {event.stripeEventId}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Page {page} of {pages} ({total} events)
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} asChild>
                        <Link href={`?page=${page - 1}&status=${status}`}>Previous</Link>
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= pages} asChild>
                        <Link href={`?page=${page + 1}&status=${status}`}>Next</Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
