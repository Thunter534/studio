'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPDFTemplate } from './report-pdf-template';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

interface ReportDownloadButtonProps {
  report: {
    student_name: string;
    assignment_title: string;
    teacher_feedback?: string;
    rubric_grades?: Array<{
      score: number;
      maxScore: number;
      criterionId: string;
      criterionName: string;
    }>;
  };
  formattedDate: string;
}

export default function ReportDownloadButton({ report, formattedDate }: ReportDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={
        <ReportPDFTemplate
          studentName={report.student_name}
          assignmentTitle={report.assignment_title}
          date={formattedDate}
          rubricGrades={report.rubric_grades || []}
          teacherFeedback={report.teacher_feedback || ''}
        />
      }
      fileName={`Report_${report.student_name.replace(/\s+/g, '_')}.pdf`}
    >
      {({ loading }) => (
        <Button 
          variant="outline" 
          disabled={loading}
          className="h-11 rounded-xl font-bold border-border bg-card shadow-sm hover:bg-secondary/50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Preparing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF Copy
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}
