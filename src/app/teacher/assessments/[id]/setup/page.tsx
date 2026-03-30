'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWebhook } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileUploader } from '@/components/file-uploader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import type { StudentListItem } from '@/lib/events';
import { normalizeAssessmentIdentifier } from '@/lib/utils';
import { getWebhookUrl } from '@/lib/webhook-config';

const STUDENT_LIST_CACHE_KEY = 'n8n:student-list';

export default function SetupPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const normalizedAssessmentId = normalizeAssessmentIdentifier(assessmentId) ?? assessmentId;
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const actor = user ? { role: user.role, userId: user.id, userName: user.name } : undefined;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize selectedStudent from URL query param
  const [selectedStudent, setSelectedStudentState] = React.useState<string | null>(null);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const handleStudentChange = useCallback((studentIdNumber: string) => {
    setSelectedStudentState(studentIdNumber);
    if (typeof window !== 'undefined') {
      const matched = students.find((student) => student.studentIdNumber === studentIdNumber);
      sessionStorage.setItem('currentStudentId', studentIdNumber);
      if (matched?.name) {
        sessionStorage.setItem('currentStudentName', matched.name);
      }
    }
  }, [students]);
  
  useEffect(() => {
    const studentIdFromUrl = searchParams.get('studentId');
    if (studentIdFromUrl) {
      setSelectedStudentState(studentIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setLoadingStudents(false);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      
      try {
        const webhookUrl = getWebhookUrl('STUDENT_LIST');
        if (!webhookUrl) {
          throw new Error('Student list webhook URL is not configured');
        }
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user: user?.name,
            ...(actor ? { actor } : {}),
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Handle array response from n8n with snake_case field mapping
        if (Array.isArray(result)) {
          const mappedStudents = result.map((student: any) => ({
            name: student.name,
            studentIdNumber: student.student_id,
            grade: student.grade,
            studentEmail: student.student_email,
            parentEmail: student.parent_email,
          }));
          setStudents(mappedStudents);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              STUDENT_LIST_CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data: mappedStudents })
            );
          }
        } else if (result.success && result.data?.students) {
          const mappedStudents = result.data.students.map((student: any) => ({
            name: student.name,
            studentIdNumber: student.student_id,
            grade: student.grade,
            studentEmail: student.student_email,
            parentEmail: student.parent_email,
          }));
          setStudents(mappedStudents);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(
              STUDENT_LIST_CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data: mappedStudents })
            );
          }
        } else {
          console.warn('[Setup] Unexpected response format:', result);
          setStudents([]);
        }
      } catch (err) {
        console.error('[Setup] Error fetching students:', err);
        if (typeof window !== 'undefined') {
          const rawValue = window.localStorage.getItem(STUDENT_LIST_CACHE_KEY);
          if (rawValue) {
            try {
              const cached = JSON.parse(rawValue) as { timestamp: number; data: StudentListItem[] };
              if (cached?.data?.length) {
                setStudents(cached.data);
                return;
              }
            } catch {
              window.localStorage.removeItem(STUDENT_LIST_CACHE_KEY);
            }
          }
        }
        toast({
          variant: 'destructive',
          title: 'Failed to load students',
          description: 'Could not fetch student list. Please refresh the page.',
        });
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [toast, user, actor, isAuthLoading]);

  const { data: assessmentData, isLoading: loadingAssessment } = useWebhook<{ assessmentId: string }, { assessment: any }>({
    eventName: 'ASSESSMENT_GET',
    payload: { assessmentId: normalizedAssessmentId },
  });



  const [activeTab, setActiveTab] = React.useState<'document' | 'image'>('document');
  const [docUploadStatus, setDocUploadStatus] = React.useState<'idle' | 'uploaded' | 'analyzing' | 'done' | 'error'>('idle');
  const [imgUploadStatus, setImgUploadStatus] = React.useState<'idle' | 'uploaded' | 'analyzing' | 'done' | 'error'>('idle');
  const [lastDocFile, setLastDocFile] = React.useState<File | null>(null);
  const [lastImgFile, setLastImgFile] = React.useState<File | null>(null);

  // On file selection we only record the file reference; analysis runs when the user clicks Analyze
  const handleTypedFile = useCallback((file: File) => {
    setLastDocFile(file);
    setDocUploadStatus('uploaded');
  }, []);

  const handleImageFile = useCallback((file: File) => {
    setLastImgFile(file);
    setImgUploadStatus('uploaded');
  }, []);

  const analyzeSelected = React.useCallback(async () => {
    // Only analyze the currently selected tab
    if (activeTab === 'document') {
      if (!(docUploadStatus === 'uploaded' || docUploadStatus === 'done' || docUploadStatus === 'error')) {
        toast({ variant: 'destructive', title: 'No file uploaded', description: 'Please upload a document first.' });
        return;
      }

      setDocUploadStatus('analyzing');
      try {
        // Extract text from TXT file
        const formData = new FormData();
        formData.append('file', lastDocFile!);

        const response = await fetch('/api/extract-text', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to extract text');
        }

        const result = await response.json();
        
        // Store extracted text and studentId in sessionStorage for the document page
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('extractedText', result.text);
          if (selectedStudent) {
            sessionStorage.setItem('currentStudentId', selectedStudent);
            const matched = students.find((student) => student.studentIdNumber === selectedStudent);
            if (matched?.name) {
              sessionStorage.setItem('currentStudentName', matched.name);
            }
          }
        }

        setDocUploadStatus('done');
        toast({ title: 'Text extracted', description: 'Redirecting to document editor...' });
        setTimeout(() => router.push(`/teacher/assessments/${assessmentId}/document`), 500);
      } catch (e) {
        console.error(e);
        setDocUploadStatus('error');
        toast({ variant: 'destructive', title: 'Extraction failed', description: 'Failed to extract text from file.' });
      }
    } else {
      // Image tab
      if (!(imgUploadStatus === 'uploaded' || imgUploadStatus === 'done' || imgUploadStatus === 'error')) {
        toast({ variant: 'destructive', title: 'No file uploaded', description: 'Please upload an image first.' });
        return;
      }

      setImgUploadStatus('analyzing');
      try {
        // Send image to n8n webhook in binary format
        const fileBuffer = await lastImgFile!.arrayBuffer();
        
        const formData = new FormData();
        formData.append('data', new Blob([fileBuffer], { type: lastImgFile!.type }));
        if (user?.name) {
          formData.append('user', user.name);
        }
        if (actor) {
          formData.append('actor.role', actor.role);
          formData.append('actor.userId', actor.userId);
        }

        const webhookUrl = getWebhookUrl('ASSESSMENT_IMAGE_EXTRACT');
        if (!webhookUrl) {
          throw new Error('Image extract webhook URL is not configured');
        }

        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to process image');
        }

        const result = await response.json();
        
        // Store extracted text and studentId in sessionStorage for the document page
        if (typeof window !== 'undefined') {
          // Handle different possible response formats from n8n
          let extractedText = '';
          
          // Check if result is an array
          if (Array.isArray(result) && result.length > 0) {
            const firstElement = result[0];
            // Check for Message property in the first element
            extractedText = firstElement.Message || firstElement.text || firstElement.extractedText || JSON.stringify(result);
          } else {
            // Handle object response
            extractedText = result.text || result.extractedText || result.extracted_text || result.Message || JSON.stringify(result);
          }
          
          sessionStorage.setItem('extractedText', extractedText);
          if (selectedStudent) {
            sessionStorage.setItem('currentStudentId', selectedStudent);
            const matched = students.find((student) => student.studentIdNumber === selectedStudent);
            if (matched?.name) {
              sessionStorage.setItem('currentStudentName', matched.name);
            }
          }
        }

        setImgUploadStatus('done');
        toast({ title: 'Image processed', description: 'Redirecting to document editor...' });
        setTimeout(() => router.push(`/teacher/assessments/${assessmentId}/document`), 500);
      } catch (e) {
        console.error(e);
        setImgUploadStatus('error');
        toast({ variant: 'destructive', title: 'Processing failed', description: 'Failed to process image.' });
      }
    }
  }, [activeTab, lastDocFile, lastImgFile, docUploadStatus, imgUploadStatus, assessmentId, selectedStudent, toast, router]);

  const anyUploaded = (
    (activeTab === 'document' && (docUploadStatus === 'uploaded' || docUploadStatus === 'done' || docUploadStatus === 'analyzing' || docUploadStatus === 'error')) ||
    (activeTab === 'image' && (imgUploadStatus === 'uploaded' || imgUploadStatus === 'done' || imgUploadStatus === 'analyzing' || imgUploadStatus === 'error'))
  );

  const isAnalyzing = activeTab === 'document' ? docUploadStatus === 'analyzing' : imgUploadStatus === 'analyzing';

  const buttonLabel = activeTab === 'document'
    ? (isAnalyzing ? 'Analyzing...' : 'Analyze Text')
    : (isAnalyzing ? 'Processing...' : 'Analyze Image');

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Setup & Input</CardTitle>
          <CardDescription>Select a student and upload their work.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="student">Student</Label>
              <Select value={selectedStudent || ''} onValueChange={handleStudentChange} disabled={loadingStudents}>
                <SelectTrigger id="student" disabled={loadingStudents}>
                  <SelectValue placeholder={loadingStudents ? 'Loading students...' : 'Select a student to assess'} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.studentIdNumber} value={s.studentIdNumber}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Upload</Label>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'document' | 'image')}>
                <TabsList>
                  <TabsTrigger value="document">Document</TabsTrigger>
                  <TabsTrigger value="image">Image</TabsTrigger>
                </TabsList>

                <TabsContent value="document">
                  <div className="pt-2">
                      {docUploadStatus === 'idle' && (
                        <FileUploader onFileSelected={handleTypedFile} acceptedFileTypes={{ 
                          'text/plain': ['.txt'],
                          'application/pdf': ['.pdf'],
                          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
                        }} />
                      )}

                      {docUploadStatus !== 'idle' && (
                        <div className="mt-3 flex items-center justify-between">
                          <div>
                            <div className="text-sm">{lastDocFile?.name}</div>
                            <div className="text-xs text-muted-foreground">{docUploadStatus === 'uploaded' ? 'Ready to analyze' : docUploadStatus === 'analyzing' ? 'Analyzing...' : docUploadStatus === 'done' ? 'Analysis complete' : 'Upload error'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" onClick={() => { setDocUploadStatus('idle'); setLastDocFile(null); }}>Replace</Button>
                            {docUploadStatus === 'done' && (
                              <Button asChild size="sm"><Link href={`/teacher/assessments/${assessmentId}/document`}>View Document</Link></Button>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>

              <TabsContent value="image">
                <div className="pt-2">
                  {imgUploadStatus === 'idle' && (
                    <FileUploader onFileSelected={handleImageFile} acceptedFileTypes={{ 'image/png': ['.png'], 'image/jpeg': ['.jpeg', '.jpg'] }} />
                  )}

                  {imgUploadStatus !== 'idle' && (
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <div className="text-sm">{lastImgFile?.name}</div>
                        <div className="text-xs text-muted-foreground">{imgUploadStatus === 'uploaded' ? 'Ready to analyze' : imgUploadStatus === 'analyzing' ? 'Analyzing...' : imgUploadStatus === 'done' ? 'Analysis complete' : 'Upload error'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => { setImgUploadStatus('idle'); setLastImgFile(null); }}>Replace</Button>
                        {imgUploadStatus === 'done' && (
                          <Button asChild size="sm"><Link href={`/teacher/assessments/${assessmentId}/document`}>View Document</Link></Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              </Tabs>
            </div>

            <div className="flex gap-2">
              <Button disabled={!anyUploaded} onClick={analyzeSelected}>
                {buttonLabel}
              </Button>
              {((activeTab === 'document' && docUploadStatus === 'error') || (activeTab === 'image' && imgUploadStatus === 'error')) && (
                <Button variant="outline" onClick={analyzeSelected}>Retry</Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
