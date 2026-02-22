'use client';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '../ui/badge';

interface ReportPreviewDrawerProps {
  reportId: string;
  initialReport?: any;
  onOpenChange: (isOpen: boolean) => void;
}

interface FinalizedReport {
  id?: string;
  student_name: string;
  assignment_title: string;
  rubric_name: string;
  teacher_feedback?: string;
  rubric_grades?: {
    total?: number;
    percentage?: number;
  };
  criteria_ratings?: Record<string, number>;
  created_at?: string;
}

export function ReportPreviewDrawer({ reportId, initialReport, onOpenChange }: ReportPreviewDrawerProps) {
    // For now, only display the report data passed from the list
    // Future: could fetch from webhook if needed
    const report = initialReport;

    // Add safety check for required fields
    if (!report) {
        return (
            <Sheet open={!!reportId} onOpenChange={onOpenChange}>
                <SheetContent className="sm:max-w-lg overflow-y-auto">
                    <p className='p-6 text-muted-foreground'>No report data available.</p>
                </SheetContent>
            </Sheet>
        );
    }

  return (
    <Sheet open={!!reportId} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
            <SheetHeader className='p-6'>
              <SheetTitle className='text-2xl'>{report.student_name ?? 'Unknown Student'}</SheetTitle>
              <SheetDescription>
                {report.assignment_title ?? 'Untitled Assignment'}
                {report.created_at && ` • Finalized ${new Date(report.created_at).toLocaleDateString()}`}
              </SheetDescription>
            </SheetHeader>
            <div className='px-6 pb-6 space-y-6'>
                {report.rubric_name && (
                    <div className="space-y-2">
                        <h3 className='font-semibold text-sm text-muted-foreground'>Rubric</h3>
                        <p className='text-base'>{report.rubric_name}</p>
                    </div>
                )}

                {report.rubric_grades && (report.rubric_grades.total || report.rubric_grades.percentage !== undefined) && (
                    <div className="space-y-2">
                        <h3 className='font-semibold text-sm text-muted-foreground'>Overall Score</h3>
                        <div className='flex items-center gap-3'>
                            {report.rubric_grades.total !== undefined && report.rubric_grades.total !== null && (
                                <Badge variant="secondary" className="text-lg px-3 py-1">
                                    {report.rubric_grades.total} pts
                                </Badge>
                            )}
                            {report.rubric_grades.percentage !== undefined && report.rubric_grades.percentage !== null && (
                                <span className='text-muted-foreground'>
                                    {Number(report.rubric_grades.percentage).toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {report.criteria_ratings && Object.keys(report.criteria_ratings).length > 0 && (
                    <div className="space-y-3">
                        <h3 className='font-semibold text-sm text-muted-foreground'>Criteria Ratings</h3>
                        <div className='rounded-md border'>
                            {Object.entries(report.criteria_ratings).map(([criterion, rating], index, array) => (
                                <div 
                                    key={criterion} 
                                    className={`flex items-center justify-between p-3 text-sm ${index < array.length - 1 ? 'border-b' : ''}`}
                                >
                                    <span className='font-medium'>{criterion}</span>
                                    <Badge 
                                        variant={rating >= 4 ? "default" : rating >= 3 ? "secondary" : "destructive"}
                                    >
                                        {rating}/5
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {report.teacher_feedback && (
                    <div className="space-y-2">
                        <h3 className='font-semibold text-sm text-muted-foreground'>Teacher Feedback</h3>
                        <p className='text-sm border-l-2 pl-4 py-2 whitespace-pre-wrap'>{report.teacher_feedback}</p>
                    </div>
                )}
            </div>
      </SheetContent>
    </Sheet>
  );
}
