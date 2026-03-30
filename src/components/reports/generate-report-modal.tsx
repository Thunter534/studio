'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { useWebhook } from '@/lib/hooks';
import type { StudentListItem, ReportGeneratePayload } from '@/lib/events';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  studentId: z.string().min(1, 'A student must be selected.'),
  periodPreset: z.string(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includeSummary: z.boolean().default(true),
  includeRubricBreakdown: z.boolean().default(true),
  includeTeacherNotes: z.boolean().default(false),
  deliveryPortal: z.boolean().default(true),
  deliveryEmail: z.boolean().default(false),
  deliveryPdf: z.boolean().default(false),
}).refine(data => {
    if (data.periodPreset === 'custom') {
        return !!data.startDate && !!data.endDate;
    }
    return true;
}, {
    message: "Both start and end dates are required for custom range.",
    path: ['startDate'],
});

type GenerateReportFormValues = z.infer<typeof formSchema>;

interface GenerateReportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSuccess: () => void;
}

export function GenerateReportModal({ isOpen, onOpenChange, onSuccess }: GenerateReportModalProps) {
  const [showCustomDates, setShowCustomDates] = useState(false);

  const { data: studentData, isLoading: studentsLoading } = useWebhook<{}, { students: StudentListItem[] }>({
    eventName: 'STUDENT_LIST',
  });

  const { trigger: generateReport, isLoading: isGenerating } = useWebhook<ReportGeneratePayload, { reportId: string }>({
      eventName: 'REPORT_GENERATE',
      manual: true,
      onSuccess,
      errorMessage: "Failed to queue report generation."
  });

  const form = useForm<GenerateReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      periodPreset: 'last_30',
      includeSummary: true,
      includeRubricBreakdown: true,
      includeTeacherNotes: false,
      deliveryPortal: true,
      deliveryEmail: false,
      deliveryPdf: false,
    },
  });

  const onSubmit = (values: GenerateReportFormValues) => {
    const payload: ReportGeneratePayload = {
        studentId: values.studentId,
        period: {
            preset: values.periodPreset !== 'custom' ? values.periodPreset as any : undefined,
            startDate: values.startDate?.toISOString(),
            endDate: values.endDate?.toISOString(),
        },
        include: {
            summary: values.includeSummary,
            rubricBreakdown: values.includeRubricBreakdown,
            teacherNotes: values.includeTeacherNotes,
        },
        delivery: {
            portal: values.deliveryPortal,
            email: values.deliveryEmail,
            pdf: values.deliveryPdf,
        }
    };
    generateReport(payload);
  };

  const handlePeriodChange = (value: string) => {
    form.setValue('periodPreset', value);
    setShowCustomDates(value === 'custom');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Select a student and options to generate a parent-friendly report. This will only use finalized assessments.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 grid gap-6">
                <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={studentsLoading}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={studentsLoading ? "Loading students..." : "Select a student"} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {studentData?.students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                
                <FormField
                    control={form.control}
                    name="periodPreset"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Reporting Period</FormLabel>
                        <Select onValueChange={handlePeriodChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="last_30">Last 30 Days</SelectItem>
                            <SelectItem value="this_month">This Month</SelectItem>
                            <SelectItem value="custom">Custom Range</SelectItem>
                        </SelectContent>
                        </Select>
                    </FormItem>
                    )}
                />

                {showCustomDates && (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Start Date</FormLabel>
                                <DatePicker date={field.value} setDate={field.onChange} placeholder='Start date' />
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>End Date</FormLabel>
                                <DatePicker date={field.value} setDate={field.onChange} placeholder='End date' />
                            </FormItem>
                            )}
                        />
                    </div>
                )}
                
                <div className="grid gap-2">
                    <FormLabel>Include Sections</FormLabel>
                     <FormField
                        control={form.control}
                        name="includeSummary"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">AI-Generated Summary</FormLabel>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="includeRubricBreakdown"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Rubric Breakdown</FormLabel>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="includeTeacherNotes"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Final Teacher Comments</FormLabel>
                        </FormItem>
                        )}
                    />
                </div>
                
                 <div className="grid gap-2">
                    <FormLabel>Delivery Options</FormLabel>
                     <FormField
                        control={form.control}
                        name="deliveryPortal"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Save to Parent Portal</FormLabel>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="deliveryEmail"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Email to Parent</FormLabel>
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="deliveryPdf"
                        render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            <FormLabel className="font-normal">Enable PDF Download</FormLabel>
                        </FormItem>
                        )}
                    />
                </div>
                {/* TODO: Add a check for eligible finalized assessments and show a warning if none */}
                <Alert variant="default" className="text-xs">
                    <AlertDescription>
                        A warning will be displayed here if no finalized assessments are available for the selected student and date range.
                    </AlertDescription>
                </Alert>

            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating || studentsLoading}>
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
