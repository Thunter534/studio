'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { UserRole } from '@/lib/auth';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const [role, setRole] = useState<UserRole>('teacher');
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
  };

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-4">
        <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
            
            {/* Left Card */}
            <Card className="flex flex-col justify-center p-8">
                <CardHeader>
                    <Logo />
                </CardHeader>
                <CardContent>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Student progress. Clear communication.
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Built for schools, teachers, and families.
                    </p>
                </CardContent>
            </Card>

            {/* Right Card */}
            <Card className="p-2 sm:p-6">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                    Sign in to continue
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="grid gap-4">
                        <RadioGroup
                        defaultValue="teacher"
                        className="grid grid-cols-2 gap-4"
                        value={role}
                        onValueChange={(value: UserRole) => setRole(value)}
                        >
                        <div>
                            <RadioGroupItem value="teacher" id="teacher" className="peer sr-only" />
                            <Label
                            htmlFor="teacher"
                            className="flex h-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                            Teacher
                            </Label>
                        </div>
                        <div>
                            <RadioGroupItem value="parent" id="parent" className="peer sr-only" />
                            <Label
                            htmlFor="parent"
                            className="flex h-full flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                            Parent
                            </Label>
                        </div>
                        </RadioGroup>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-2">
                        <Button type="submit" className="w-full">
                            Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Demo login for project preview.
                        </p>
                    </CardFooter>
                </form>
            </Card>
        </div>
    </main>
  );
}
