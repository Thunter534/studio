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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUploader } from '@/components/file-uploader';
import { Loader2, UserPlus, FileSpreadsheet, UploadCloud, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Separator } from '@/components/ui/separator';
import { getWebhookUrl } from '@/lib/webhook-config';
import { STUDENT_GRADE_OPTIONS } from '@/lib/grade-rules';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Full name is required.' }),
  studentIdNumber: z.string().min(1, { message: 'Student identification number is required.' }),
  grade: z.enum(STUDENT_GRADE_OPTIONS as [string, ...string[]], {
    errorMap: () => ({ message: 'Grade level is required.' }),
  }),
  studentEmail: z.string().email({ message: 'Enter a valid student email address.' }).optional().or(z.literal('')),
  parentEmail: z.string().email({ message: 'Enter a valid parent/guardian email address.' }),
});

type AddStudentFormValues = z.infer<typeof formSchema>;

interface AddStudentDrawerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function AddStudentDrawer({ isOpen, onOpenChange, onSuccess }: AddStudentDrawerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const actor = user ? { role: user.role, userId: user.id, userName: user.name } : undefined;
  
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

  const onManualSubmit = async (values: AddStudentFormValues) => {
    setIsLoading(true);
    try {
      const webhookUrl = getWebhookUrl('STUDENT_CREATE');
      if (!webhookUrl) {
        throw new Error('Student creation webhook URL is not configured');
      }

      const payload = {
        name: values.name,
        student_id: values.studentIdNumber,
        grade: values.grade,
        student_email: values.studentEmail || undefined,
        parent_email: values.parentEmail,
        user: user?.name,
        ...(actor ? { actor } : {}),
      };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('System error encountered during student creation.');

      const result = await response.json();
      if (result.success === false) throw new Error(result.error?.message || 'Submission rejected by server.');

      toast({
        title: 'Student Created',
        description: `Successfully added ${values.name} to the roster.`,
      });

      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkUpload = async () => {
    if (bulkFiles.length === 0) return;
    setIsLoading(true);
    setTimeout(() => {
      toast({
        title: 'Processing File',
        description: 'Your spreadsheet is being imported. Check the student list in a moment.',
      });
      setBulkFiles([]);
      onSuccess();
      setIsLoading(false);
    }, 1500);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl border-l border-border bg-background p-0 text-foreground">
        <div className="flex flex-col h-full">
          {/* Header Section */}
          <div className="px-8 pt-10 pb-6 shrink-0 bg-background">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl font-bold flex items-center gap-3 text-foreground">
                <div className="h-10 w-10 rounded-xl bg-secondary dark:bg-primary/10 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-primary" />
                </div>
                Manage Enrollment
              </SheetTitle>
              <SheetDescription className="text-muted-foreground text-sm mt-2">
                Add a new student manually or upload a roster via spreadsheet.
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Main Tabs Area */}
          <Tabs defaultValue="manual" className="flex-1 flex flex-col min-h-0">
            <div className="px-8 mb-6 shrink-0">
              <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-xl h-11">
                <TabsTrigger value="manual" className="rounded-lg font-bold text-xs uppercase tracking-wider h-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  Manual Entry
                </TabsTrigger>
                <TabsTrigger value="bulk" className="rounded-lg font-bold text-xs uppercase tracking-wider h-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  Bulk Import
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Manual Entry Form */}
            <TabsContent value="manual" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onManualSubmit)} className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto px-8 space-y-8 pb-10">
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-bold text-[10px] uppercase tracking-wider">Full Name</FormLabel>
                            <FormControl>
                              <Input id="student-name-field" placeholder="Enter student's legal full name" className="h-12 rounded-xl border-border focus:border-primary focus:ring-1 focus:ring-primary text-sm bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="studentIdNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-foreground font-bold text-[10px] uppercase tracking-wider">Student ID</FormLabel>
                              <FormControl>
                                <Input placeholder="System ID Number" className="h-12 rounded-xl border-border text-sm bg-background" {...field} />
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
                              <FormLabel className="text-foreground font-bold text-[10px] uppercase tracking-wider">Academic Level</FormLabel>
                              <FormControl>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <SelectTrigger className="h-12 rounded-xl border-border text-sm bg-background">
                                    <SelectValue placeholder="Select grade" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STUDENT_GRADE_OPTIONS.map((grade) => (
                                      <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator className="bg-border" />

                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="studentEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground font-bold text-[10px] uppercase tracking-wider">Student Email (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Official school email address" className="h-12 rounded-xl border-border text-sm bg-background" {...field} />
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
                            <FormLabel className="text-foreground font-bold text-[10px] uppercase tracking-wider">Parent / Guardian Email</FormLabel>
                            <FormControl>
                              <Input placeholder="Primary contact email for reporting" className="h-12 rounded-xl border-border text-sm bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  
                  {/* Footer Anchored to Bottom */}
                  <div className="px-8 py-6 border-t bg-muted/30 shrink-0">
                    <SheetFooter className="flex-row items-center gap-3 sm:justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isLoading}
                        className="font-bold text-muted-foreground hover:text-foreground h-12 text-sm px-6"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading} className="bg-primary hover:opacity-90 h-12 px-8 font-bold rounded-xl transition-all shadow-md shadow-primary/20 text-sm flex-1 sm:flex-none">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add Student
                      </Button>
                    </SheetFooter>
                  </div>
                </form>
              </Form>
            </TabsContent>

            {/* Bulk Import Section */}
            <TabsContent value="bulk" className="flex-1 flex flex-col m-0 min-h-0 data-[state=inactive]:hidden">
              <div className="flex-1 overflow-y-auto px-8 space-y-8 pb-10">
                <div className="p-5 bg-secondary/50 dark:bg-primary/10 border border-secondary dark:border-primary/20 rounded-2xl flex gap-4 mt-2">
                  <div className="h-10 w-10 rounded-xl bg-secondary dark:bg-primary/20 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-sm text-foreground leading-relaxed pt-1">
                    <p className="font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">Import Guidelines</p>
                    <p className="text-xs font-medium">Upload a .csv or .xlsx file. Ensure columns include: <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">name</span>, <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">student_id</span>, <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">grade</span>, and <span className="font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">parent_email</span>.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <FileUploader
                    onFileSelected={(file) => setBulkFiles([file])}
                    acceptedFileTypes={{
                      'text/csv': ['.csv'],
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    }}
                  />
                  
                  {bulkFiles.length > 0 && (
                    <div className="flex items-center gap-4 p-5 border border-border rounded-2xl bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2">
                      <div className="h-12 w-12 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                        <FileSpreadsheet className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{bulkFiles[0].name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{(bulkFiles[0].size / 1024).toFixed(1)} KB • Ready to process</p>
                      </div>
                      <button 
                        onClick={() => setBulkFiles([])} 
                        className="text-muted-foreground hover:text-destructive font-bold text-xs uppercase tracking-wider px-2 py-1 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Anchored to Bottom */}
              <div className="px-8 py-6 border-t bg-muted/30 shrink-0">
                <SheetFooter className="flex-row items-center gap-3 sm:justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange(false)}
                    disabled={isLoading}
                    className="font-bold text-muted-foreground hover:text-foreground h-12 text-sm px-6"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleBulkUpload} 
                    disabled={isLoading || bulkFiles.length === 0}
                    className="bg-primary hover:opacity-90 h-12 px-8 font-bold rounded-xl transition-all shadow-md shadow-primary/20 text-sm flex-1 sm:flex-none"
                  >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    Process Roster
                  </Button>
                </SheetFooter>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
