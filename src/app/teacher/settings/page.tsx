
'use client';

import React from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebhook } from "@/lib/hooks";
import type { HealthCheckData, RubricListItem } from "@/lib/events";
import { CheckCircle2, AlertCircle, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

function ProfileTabContent() {
    const { user } = useAuth();
    const { toast } = useToast();

    return (
         <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Manage your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input id="fullName" defaultValue={user?.name} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="school">School / Organization</Label>
                    <Input id="school" placeholder="e.g. Springfield Elementary" />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" readOnly defaultValue={user?.email} />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" readOnly defaultValue={user?.role} className="capitalize" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                     <Select defaultValue="est">
                        <SelectTrigger id="timezone">
                            <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="est">Eastern Time (US & Canada)</SelectItem>
                            <SelectItem value="cst">Central Time (US & Canada)</SelectItem>
                            <SelectItem value="mst">Mountain Time (US & Canada)</SelectItem>
                            <SelectItem value="pst">Pacific Time (US & Canada)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={() => toast({title: "Profile Saved", description: "Your profile information has been updated."})}>Save Profile</Button>
            </CardFooter>
        </Card>
    )
}

function ClassSettingsTabContent() {
    const { toast } = useToast();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Class Settings</CardTitle>
                <CardDescription>Manage settings for your default class.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="defaultClass">Default Class / Grade</Label>
                    <Input id="defaultClass" placeholder="e.g. Grade 5" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="term">Term / Semester Label</Label>
                    <Input id="term" placeholder="e.g. Fall 2024" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="classStatus">Class Status</Label>
                    <Select id="classStatus" defaultValue="active">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={() => toast({title: "Class Settings Saved"})}>Save Class Settings</Button>
            </CardFooter>
        </Card>
    );
}

function AssessmentDefaultsTabContent() {
    const { toast } = useToast();
     const { data: rubricsData, isLoading: rubricsLoading } = useWebhook<{}, { rubrics: RubricListItem[] }>({
        eventName: 'RUBRIC_LIST',
    });
    return (
        <Card>
            <CardHeader>
                <CardTitle>Assessment Defaults</CardTitle>
                <CardDescription>Set your default preferences for creating new assessments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="default-rubric">Default Rubric</Label>
                    <Select name="default-rubric" disabled={rubricsLoading}>
                        <SelectTrigger id="default-rubric">
                            <SelectValue placeholder={rubricsLoading ? "Loading rubrics..." : "Select a default rubric"} />
                        </SelectTrigger>
                        <SelectContent>
                             <SelectItem value="none">None</SelectItem>
                            {rubricsData?.rubrics.map((rubric, index) => (
                                <SelectItem key={`${rubric.name}-${index}`} value={rubric.name}>
                                    {rubric.name} <span className="text-muted-foreground ml-2">(v{rubric.version})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="grading-strictness">Grading Strictness</Label>
                    <Select id="grading-strictness" defaultValue="standard">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="gentle">Gentle</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="strict">Strict</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="auto-create-draft" className="flex flex-col space-y-1">
                        <span>Auto-create draft on upload</span>
                        <span className="font-normal leading-snug text-muted-foreground">
                            Automatically create and open a draft when a student file is uploaded.
                        </span>
                    </Label>
                    <Switch id="auto-create-draft" />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="require-approval" className="flex flex-col space-y-1">
                        <span>Require teacher approval before finalization</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            Ensures you manually confirm all grades and feedback.
                        </span>
                    </Label>
                    <Switch id="require-approval" defaultChecked />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={() => toast({title: "Assessment Defaults Saved"})}>Save Defaults</Button>
            </CardFooter>
        </Card>
    );
}

function ReportsPreferencesTabContent() {
    const { toast } = useToast();
    return (
        <Card>
            <CardHeader>
                <CardTitle>Report Preferences</CardTitle>
                <CardDescription>Customize how reports are generated and delivered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="default-period">Default Report Period</Label>
                    <Select id="default-period" defaultValue="last_30">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last_30">Last 30 Days</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="quarter">This Quarter</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="include-comments" className="flex flex-col space-y-1">
                        <span>Include teacher comments by default</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            You can override this for each report.
                        </span>
                    </Label>
                    <Switch id="include-comments" defaultChecked />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="allow-pdf" className="flex flex-col space-y-1">
                        <span>Allow PDF download by default</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                            Makes reports downloadable for parents.
                        </span>
                    </Label>
                    <Switch id="allow-pdf" defaultChecked />
                </div>
                 <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label htmlFor="auto-save" className="flex flex-col space-y-1">
                        <span>Auto-save generated reports to Parent Portal</span>
                         <span className="font-normal leading-snug text-muted-foreground">
                           Ensures parents always see the latest version.
                        </span>
                    </Label>
                    <Switch id="auto-save" defaultChecked />
                </div>
            </CardContent>
            <CardFooter>
                <Button onClick={() => toast({title: "Report Preferences Saved"})}>Save Preferences</Button>
            </CardFooter>
        </Card>
    );
}

function IntegrationsTabContent() {
    const { data, isLoading, error, trigger } = useWebhook<{}, HealthCheckData>({ 
        eventName: 'HEALTH_CHECK',
    });

    function StatusIndicator({ status, text }: { status: boolean; text: string }) {
        return (
            <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="font-medium">{text}</span>
                <div className={cn(
                    "flex items-center gap-2 text-sm",
                    status ? "text-green-600" : "text-destructive"
                )}>
                    {status ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                    {status ? "Connected" : "Error"}
                </div>
            </div>
        )
    }

    function StatusSkeleton() {
        return <Skeleton className="h-[58px] w-full" />
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Integrations</CardTitle>
                <CardDescription>
                    Health check for connected services. For developer use.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoading && !data && !error && (
                    <>
                        <StatusSkeleton />
                        <StatusSkeleton />
                        <StatusSkeleton />
                    </>
                )}
                {error && <p className="text-destructive">Failed to fetch health status: {error.message}</p>}
                {data && (
                    <>
                        <StatusIndicator status={data.authConfigured} text="Authentication Provider" />
                        <StatusIndicator status={data.webhookConfigured} text="Webhook Gateway (n8n)" />
                        <StatusIndicator status={data.databaseConnected} text="Database Connection" />
                        {data.lastSuccessfulCall && (
                            <div className="text-sm text-muted-foreground pt-2">
                                Last successful webhook call: {new Date(data.lastSuccessfulCall).toLocaleString()}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
             <CardFooter className='flex-col items-start gap-4'>
                <Button variant="outline" onClick={() => trigger()} disabled={isLoading}>
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Refresh Status
                </Button>
                 <Button variant="destructive">Retry All Failed Events</Button>
            </CardFooter>
        </Card>
    );
}

function SecurityTabContent() {
    const { toast } = useToast();
    return (
         <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-method">Login Method</Label>
                    <Input id="login-method" readOnly defaultValue="Mock Authentication (Demo)" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="session-timeout">Session Timeout</Label>
                    <Select id="session-timeout" defaultValue="1_hour">
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="15_min">15 minutes</SelectItem>
                            <SelectItem value="1_hour">1 hour</SelectItem>
                            <SelectItem value="8_hours">8 hours</SelectItem>
                             <SelectItem value="never">Never</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
            <CardFooter className='flex-col items-start gap-4'>
                <Button onClick={() => toast({title: "Security Settings Saved"})}>Save Security Settings</Button>
                <Button variant="destructive" onClick={() => toast({title: "All sessions have been signed out."})}>Sign Out of All Other Sessions</Button>
            </CardFooter>
        </Card>
    );
}


function SystemTabContent() {
    const { toast } = useToast();
    return (
         <Card>
            <CardHeader>
                <CardTitle>System</CardTitle>
                <CardDescription>System information and developer actions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label htmlFor="app-version">App Version</Label>
                    <Input id="app-version" readOnly defaultValue="1.0.0-beta" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="environment">Environment</Label>
                    <Input id="environment" readOnly defaultValue="Preview" />
                </div>
            </CardContent>
            <CardFooter>
                <Button variant="destructive" onClick={() => toast({title: "Demo data has been reset."})}>Reset Demo Data</Button>
            </CardFooter>
        </Card>
    );
}

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <PageHeader
                title="Settings"
                description="Manage your profile, class settings, and system preferences."
            />
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-7 mb-6">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="class">Class</TabsTrigger>
                    <TabsTrigger value="assessments">Assessments</TabsTrigger>
                    <TabsTrigger value="reports">Reports</TabsTrigger>
                    <TabsTrigger value="integrations">Integrations</TabsTrigger>
                    <TabsTrigger value="security">Security</TabsTrigger>
                    <TabsTrigger value="system">System</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile"><ProfileTabContent /></TabsContent>
                <TabsContent value="class"><ClassSettingsTabContent /></TabsContent>
                <TabsContent value="assessments"><AssessmentDefaultsTabContent /></TabsContent>
                <TabsContent value="reports"><ReportsPreferencesTabContent /></TabsContent>
                <TabsContent value="integrations"><IntegrationsTabContent /></TabsContent>
                <TabsContent value="security"><SecurityTabContent /></TabsContent>
                <TabsContent value="system"><SystemTabContent /></TabsContent>
            </Tabs>
        </div>
    );
}
