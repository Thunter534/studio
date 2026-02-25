'use client';

import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { StudentCreatePayload } from '@/lib/events';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  studentIdNumber: z.string().min(1, { message: 'Student ID Number is required.' }),
  grade: z.string().min(1, { message: 'Grade is required.' }),
  studentEmail: z.string().email({ message: 'Invalid email address.' }).optional().or(z.literal('')),
  parentEmail: z.string().email({ message: 'A valid parent email is required.' }),
});

type AddStudentFormValues = z.infer<typeof formSchema>;

interface AddStudentDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

const N8N_STUDENT_CREATE_WEBHOOK = 'https://n8n.srv1336679.hstgr.cloud/webhook/203cb33d-b8da-44fa-830c-262685238a2f';

export function AddStudentDrawer({ isOpen, onOpenChange, onSuccess }: AddStudentDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<AddStudentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      studentIdNumber: '',
      grade: '',
      studentEmail: '',
      parentEmail: '',
    },
  });

  const onSubmit = async (values: AddStudentFormValues) => {
    setIsLoading(true);
    
    try {
      console.log('[AddStudent] Sending to n8n webhook:', values);
      
      // Map camelCase to snake_case for n8n
      const payload = {
        name: values.name,
        student_id: values.studentIdNumber,
        grade: values.grade,
        student_email: values.studentEmail || undefined,
        parent_email: values.parentEmail,
      };
      
      const response = await fetch(N8N_STUDENT_CREATE_WEBHOOK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[AddStudent] Response from n8n:', result);

      // Check if response matches expected format
      // Expected: { success: boolean, data?: { studentId: string }, error?: any }
      if (result.success === false) {
        throw new Error(result.error?.message || 'Failed to create student');
      }

      toast({
        title: 'Student Added',
        description: `${values.name} has been successfully added to your roster.`,
      });

      form.reset();
      onSuccess();
      
    } catch (error) {
      console.error('[AddStudent] Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not add student. Please check the details and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <SheetHeader>
              <SheetTitle>Add New Student</SheetTitle>
              <SheetDescription>
                Fill in the details below to add a new student to your roster.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 py-6 space-y-4 overflow-y-auto pr-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student ID Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., S12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Grade 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Email (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., jane.doe@student.school.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="parentEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Email</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., parent@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Student
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
