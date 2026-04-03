'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWebhook } from "@/lib/hooks";
import type { HealthCheckData } from "@/lib/events";
import { CheckCircle2, AlertCircle, RefreshCw, Server, Database, Lock, User, Bell, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { isWebhookConfigured } from '@/lib/webhook-config';
import { OnboardingTour } from '@/components/onboarding-tour';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

function ProfileTabContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [fullName, setFullName] = useState('');
    const [school, setSchool] = useState('');

    useEffect(() => {
        setFullName(user?.name ?? '');
    }, [user?.name]);

    return (
         <div className="space-y-6">
            <Card className="border-border/50 shadow-sm bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Personal Information
                    </CardTitle>
                    <CardDescription>Manage how your name and details appear across the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-6 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-secondary/20 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="school" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">School / Organization</Label>
                            <Input
                                id="school"
                                placeholder="e.g. Springfield Elementary"
                                value={school}
                                onChange={(e) => setSchool(e.target.value)}
                                className="bg-secondary/20 h-11"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Work Email</Label>
                        <Input id="email" readOnly value={user?.email ?? ''} className="bg-secondary/50 text-muted-foreground h-11" />
                    </div>
                </CardContent>
                <CardFooter className="border-t border-border/50 pt-6">
                    <Button onClick={() => toast({title: "Profile Saved", description: "Your personal information has been updated."})} className="font-bold rounded-xl h-11 px-8">
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-border/50 shadow-sm bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Preferences
                    </CardTitle>
                    <CardDescription>Configure your workspace and notification settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Email Notifications</Label>
                            <p className="text-xs text-muted-foreground">Receive weekly summary reports of classroom performance.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Auto-Save Drafts</Label>
                            <p className="text-xs text-muted-foreground">Automatically save assessment drafts as you work.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                </CardContent>
            </Card>
         </div>
    )
}

function IntegrationsTabContent() {
    const { data, isLoading, trigger: checkHealth } = useWebhook<{}, HealthCheckData>({ 
        eventName: 'HEALTH_CHECK',
        manual: true,
    });

    function StatusIndicator({ status, text, icon: Icon }: { status: boolean; text: string; icon: any }) {
        return (
            <div className="flex items-center justify-between rounded-xl border border-border/50 bg-secondary/10 p-4 transition-all hover:bg-secondary/20">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2.5 rounded-xl shadow-sm", status ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-destructive/10 text-destructive border border-destructive/20")}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <span className="font-bold text-sm block">{text}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{status ? 'Active' : 'Not Connected'}</span>
                    </div>
                </div>
                <div className={cn(
                    "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border",
                    status ? "text-green-500 bg-green-500/5 border-green-500/20" : "text-destructive bg-destructive/5 border-destructive/20"
                )}>
                    {status ? <CheckCircle2 className="h-3 w-3"/> : <AlertCircle className="h-3 w-3"/>}
                    {status ? "Online" : "Action Required"}
                </div>
            </div>
        )
    }

    return (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-secondary/5 border-b border-border/50 pb-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    System Status
                </CardTitle>
                <CardDescription>
                    Verify connectivity with your n8n automation workflows and Supabase database.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
                <div className="grid gap-4">
                    <StatusIndicator status={isWebhookConfigured('STUDENT_LIST')} text="Webhook Gateway" icon={Server} />
                    <StatusIndicator status={data?.databaseConnected ?? false} text="Supabase Database" icon={Database} />
                    <StatusIndicator status={true} text="Athena Identity Provider" icon={Lock} />
                </div>
            </CardContent>
             <CardFooter className='flex items-center gap-3 bg-secondary/5 p-6 border-t border-border/50'>
                <Button variant="outline" onClick={() => checkHealth()} disabled={isLoading} className="font-bold rounded-xl h-11 border-border shadow-sm bg-background">
                    <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
                    Check Health
                </Button>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                    Last check: {data?.lastSuccessfulCall ? new Date(data.lastSuccessfulCall).toLocaleTimeString() : 'Never'}
                </p>
            </CardFooter>
        </Card>
    );
}

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            <OnboardingTour />
            <PageHeader
                title="System Settings"
                description="Manage your professional profile, notification preferences, and verify system-wide integrations."
                hideBack
            />
            
            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:w-[400px] mb-10 bg-secondary/30 p-1.5 rounded-2xl border border-border/50 h-14">
                    <TabsTrigger value="profile" className="rounded-xl font-bold text-xs uppercase tracking-wider h-11 data-[state=active]:shadow-md">
                        <User className="h-3.5 w-3.5 mr-2" />
                        Account
                    </TabsTrigger>
                    <TabsTrigger value="integrations" className="rounded-xl font-bold text-xs uppercase tracking-wider h-11 data-[state=active]:shadow-md">
                        <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                        Integrations
                    </TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <ProfileTabContent />
                </TabsContent>
                
                <TabsContent value="integrations" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <IntegrationsTabContent />
                </TabsContent>
            </Tabs>
        </div>
    );
}
