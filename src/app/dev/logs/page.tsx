
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { devLogger, type LogEntry } from '@/lib/logger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

function JsonViewer({ data }: { data: any }) {
    return (
        <pre className="mt-2 w-full overflow-auto rounded-md bg-secondary p-2 text-xs">
            {JSON.stringify(data, null, 2)}
        </pre>
    )
}

export default function DevLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    useEffect(() => {
        setLogs(devLogger.getLogs());
    }, []);

    const handleRefresh = () => {
        setLogs(devLogger.getLogs());
    };

    return (
        <div>
            <PageHeader 
                title="Webhook Dev Logs"
                description="A real-time log of the last 50 webhook requests made from this browser session."
                actions={<Button onClick={handleRefresh}>Refresh</Button>}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Logs are stored in-memory and will be cleared on page refresh.</CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <p className="text-muted-foreground">No webhook calls have been logged yet. Navigate the app to generate logs.</p>
                    ) : (
                        <Accordion type="single" collapsible className="w-full">
                            {logs.map((log) => (
                                <AccordionItem value={log.id} key={log.id}>
                                    <AccordionTrigger>
                                        <div className="flex w-full items-center justify-between pr-4">
                                            <div className="flex items-center gap-4">
                                                <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className={log.status === 'success' ? 'bg-green-600' : ''}>
                                                    {log.status.toUpperCase()}
                                                </Badge>
                                                <span className="font-semibold">{log.eventName}</span>
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true }).replace('about ', '')}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4 p-2">
                                            <div>
                                                <h4 className="font-semibold">Request</h4>
                                                <JsonViewer data={log.request} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Response</h4>
                                                <JsonViewer data={log.response} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold">Correlation ID</h4>
                                                <p className="font-mono text-xs text-muted-foreground">{log.correlationId}</p>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
