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
    ai_output?: string;
  };
  rubricGrades: Array<{
    criterionName: string;
    score: number;
    maxScore: number;
  }>;
  formattedDate: string;
  documentId?: string;
}

export default function ReportDownloadButton({ report, rubricGrades, formattedDate, documentId }: ReportDownloadButtonProps) {
  // Enforce the specific filename format: Athena_[Student Name].pdf
  const filename = `Athena_${report.student_name.replace(/\s+/g, '_')}.pdf`;
  
  // Ensure we have a deterministic ID for the PDF content
  const displayId = documentId || `ATH-${report.student_name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  return (
    <PDFDownloadLink
      document={
        <ReportPDFTemplate
          studentName={report.student_name}
          assignmentTitle={report.assignment_title}
          date={formattedDate}
          rubricGrades={rubricGrades}
          teacherFeedback={report.teacher_feedback || ''}
          aiOutput={report.ai_output}
          documentId={displayId}
        />
      }
      fileName={filename}
    >
      {({ loading, error }) => {
        if (error) {
          console.error('[PDF Gen] Critical failure:', error);
        }
        return (
          <Button 
            variant="outline" 
            disabled={loading}
            className="h-11 rounded-xl font-bold border-border bg-card shadow-sm hover:bg-secondary/50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Compiling Document...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>
        );
      }}
    </PDFDownloadLink>
  );
}
