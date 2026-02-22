'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useWebhook } from '@/lib/hooks';
import type { AssessmentWorkspaceData, AISuggestion, RubricListItem } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/file-uploader';
import { ArrowLeft, CheckCircle, FileCheck2, FileText, ImageIcon, Loader2, Lock, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FinalizeConfirmationDialog } from '@/components/assessment-workspace/finalize-dialog';
import { AssessmentWorkspaceSkeleton } from '@/components/assessment-workspace/skeletons';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { normalizeAssessmentIdentifier } from '@/lib/utils';

// --- Helper Functions and Components ---

function getStatusPill(status: AssessmentWorkspaceData['status']) {
    const variants = {
        draft: 'secondary',
        ai_draft_ready: 'default',
        needs_review: 'destructive',
        finalized: 'outline',
    } as const;
    const text = {
        draft: 'Draft',
        ai_draft_ready: 'AI Draft Ready',
        needs_review: 'Needs Review',
        finalized: 'Finalized',
    } as const;

    return <Badge variant={variants[status]}>{text[status]}</Badge>;
}

function resolveAssessmentId(value?: string | null, fallback?: string | null) {
    return normalizeAssessmentIdentifier(value) ?? normalizeAssessmentIdentifier(fallback) ?? value ?? fallback ?? '';
}

function WorkspaceHeader({ data, onRunAI, onFinalize }: { data: AssessmentWorkspaceData, onRunAI: () => void, onFinalize: () => void }) {
    const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
    
    const showRunAI = data.status === 'draft' && !!data.currentText && !!data.rubricName;
    const showFinalize = data.status === 'ai_draft_ready' || data.status === 'needs_review';

    return (
        <>
        <FinalizeConfirmationDialog 
            isOpen={isFinalizeOpen}
            onOpenChange={setIsFinalizeOpen}
            onConfirm={onFinalize}
        />
        <div className="mb-6">
            <div className="mb-4">
                <Button asChild variant="outline" size="sm">
                    <Link href={`/teacher/students/${data.student.id}`}><ArrowLeft className="mr-2 h-4 w-4" /> Back to Student</Link>
                </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{data.title}</h1>
                    <p className="mt-1 text-muted-foreground">For {data.student.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    {getStatusPill(data.status)}
                    {showRunAI && <Button onClick={onRunAI}><Sparkles className="mr-2 h-4 w-4" /> Run AI Grading</Button>}
                    {showFinalize && <Button onClick={() => setIsFinalizeOpen(true)}><CheckCircle className="mr-2 h-4 w-4" /> Finalize Assessment</Button>}
                </div>
            </div>
        </div>
        </>
    );
}

function SetupInputPanel({ 
    assessment, 
    rubrics,
    onAssessmentUpdate,
}: { 
    assessment: AssessmentWorkspaceData, 
    rubrics: RubricListItem[],
    onAssessmentUpdate: (data: Partial<AssessmentWorkspaceData>) => void,
}) {
    const [text, setText] = useState(assessment.currentText || '');
    
    const onSetRubricSuccess = useCallback((data: { assessmentId: string, rubricName: string }) => {
        onAssessmentUpdate({ rubricName: data.rubricName });
    }, [onAssessmentUpdate]);

    const { trigger: setRubric, isLoading: isSettingRubric } = useWebhook<{ assessmentId: string; rubricName: string }, { assessmentId: string, rubricName: string }>({
        eventName: 'ASSESSMENT_SET_RUBRIC',
        manual: true,
        onSuccess: onSetRubricSuccess,
        errorMessage: "Failed to set rubric."
    });

    const onRunAIGradeSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
        onAssessmentUpdate(data.assessment);
    }, [onAssessmentUpdate]);

    const { trigger: runAiGrade, isLoading: isRunningAi } = useWebhook<{ assessmentId: string }, { assessment: AssessmentWorkspaceData }>({
        eventName: 'ASSESSMENT_RUN_AI_GRADE',
        manual: true,
        onSuccess: onRunAIGradeSuccess,
    });

    const onUploadTypedFileSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
        onAssessmentUpdate(data.assessment);
    }, [onAssessmentUpdate]);

        const assessmentId = resolveAssessmentId(assessment.id);
    const { trigger: uploadTypedFile, isLoading: isUploadingTyped } = useWebhook<{ assessmentId: string; fileRef: string }, { assessment: AssessmentWorkspaceData }>({
        eventName: 'ASSESSMENT_TYPED_UPLOAD',
        manual: true,
        onSuccess: onUploadTypedFileSuccess,
        errorMessage: "Failed to upload and process file."
    });
    
    const onUpdateTextSuccess = useCallback((data: { assessmentId: string, text: string }) => {
        onAssessmentUpdate({ currentText: data.text });
    }, [onAssessmentUpdate]);
    
    const { trigger: updateText, isLoading: isUpdatingText } = useWebhook<{ assessmentId: string, text: string, source: 'handwritten_extracted' }, { assessmentId: string, text: string }>({
        eventName: 'ASSESSMENT_TEXT_UPDATE',
        manual: true,
        onSuccess: onUpdateTextSuccess,
        errorMessage: "Failed to save extracted text."
    });


    const onExtractTextSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
        onAssessmentUpdate(data.assessment);
        setText(data.assessment.currentText || '');
    }, [onAssessmentUpdate]);

    const { trigger: extractText, isLoading: isExtracting } = useWebhook<{ assessmentId: string; fileRef: string }, { assessment: AssessmentWorkspaceData }>({
        eventName: 'ASSESSMENT_EXTRACT_TEXT',
        manual: true,
        onSuccess: onExtractTextSuccess,
        errorMessage: 'Failed to extract text from image.'
    });

    const handleTypedFileSelect = useCallback((files: File[]) => {
        if (files.length > 0 && assessment.rubricName) {
            // Here you would normally upload the file to a storage service and get a fileRef.
            // For the mock, we'll just use the file name as the ref.
            uploadTypedFile({ assessmentId: assessment.id, fileRef: files[0].name });
        }
    }, [uploadTypedFile, assessment]);
    
    const handleHandwrittenFileSelect = useCallback((files: File[]) => {
        if (files.length > 0) {
            extractText({ assessmentId: assessment.id, fileRef: files[0].name });
        }
    }, [extractText, assessment.id]);

    const handleSaveExtractedText = useCallback(() => {
        updateText({ assessmentId: assessment.id, text, source: 'handwritten_extracted' });
    }, [updateText, assessment.id, text]);

    const isFinalized = assessment.status === 'finalized';
    const isHandwrittenTextLocked = assessment.aiReview?.status === 'ready' || assessment.aiReview?.status === 'running' || assessment.status === 'finalized';

    const selectedRubricName = useMemo(() => {
        return assessment.rubricName || '';
    }, [assessment.rubricName]);

    const isProcessing = isUploadingTyped || isExtracting || isRunningAi || isUpdatingText;

    return (
        <div className="h-full rounded-lg bg-card p-4 border flex flex-col">
            <h3 className="text-lg font-semibold mb-1">Setup & Input</h3>
            <p className="text-sm text-muted-foreground mb-4">Select rubric and provide student work.</p>
            
            <div className='space-y-4'>
                {/* Rubric Selection */}
                <div className="space-y-2">
                    <Label htmlFor="rubric">Rubric</Label>
                    <Select 
                        name="rubric" 
                        required 
                        onValueChange={(rubricName) => setRubric({ assessmentId: assessment.id, rubricName })}
                        value={assessment.rubricName || ''}
                        disabled={isSettingRubric || isFinalized || isProcessing}
                    >
                        <SelectTrigger id="rubric" disabled={isSettingRubric || isFinalized || isProcessing}>
                            <SelectValue placeholder={isSettingRubric ? "Saving..." : (selectedRubricName || "Select a rubric")} />
                        </SelectTrigger>
                        <SelectContent>
                            {rubrics.map(rubric => (
                                <SelectItem key={rubric.name} value={rubric.name}>
                                    {rubric.name} (v{rubric.version})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Separator />
            
                {/* Submission Input */}
                <Tabs defaultValue="typed">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="typed" disabled={isFinalized || isProcessing}><FileText className="mr-2 h-4 w-4" /> Typed</TabsTrigger>
                        <TabsTrigger value="handwritten" disabled={isFinalized || isProcessing}><ImageIcon className="mr-2 h-4 w-4" /> Handwritten</TabsTrigger>
                    </TabsList>
                    <TabsContent value="typed" className="pt-4">
                        <div className="space-y-4">
                            {isUploadingTyped || isRunningAi ? (
                                <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="animate-spin mr-2" />Processing file and starting AI review...</div>
                            ) : (
                                <>
                                    {!assessment.currentText ? (
                                        <>
                                            <FileUploader onFileSelected={handleTypedFileSelect} acceptedFileTypes={{'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt']}} />
                                             {!assessment.rubricName &&
                                                <Alert variant="destructive" className="text-xs mt-2">
                                                    <AlertDescription>Please select a rubric before uploading a document.</AlertDescription>
                                                </Alert>
                                            }
                                        </>
                                    ) : (
                                        <div className="p-4 border rounded-md bg-muted/50 text-sm">
                                            <p className="font-semibold text-foreground flex items-center"><FileCheck2 className="mr-2 h-4 w-4 text-green-600" /> Document Saved</p>
                                            <p className="text-muted-foreground mt-1">The student's document is now locked and ready for AI grading.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </TabsContent>
                    <TabsContent value="handwritten" className="pt-4">
                         <div className="space-y-4">
                            {isExtracting ? (
                                <div className="flex items-center text-sm text-muted-foreground"><Loader2 className="animate-spin mr-2" />Extracting text from image...</div>
                            ) : (
                                <>
                                    {!assessment.currentText && (
                                        <FileUploader onFileSelected={handleHandwrittenFileSelect} acceptedFileTypes={{'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png']}} />
                                    )}
                                </>
                            )}
                            
                            {assessment.currentText && (
                                <>
                                <div className='space-y-1'>
                                    <Label htmlFor='extracted-text'>Extracted Text (Editable)</Label>
                                    <Textarea 
                                        id='extracted-text'
                                        placeholder="Extracted text will appear here. You can edit it before running the AI review." 
                                        className="h-48"
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        readOnly={isFinalized || isHandwrittenTextLocked}
                                    />
                                </div>
                                {!isHandwrittenTextLocked && (
                                    <div className='flex flex-wrap gap-2'>
                                         <Button onClick={handleSaveExtractedText} disabled={isUpdatingText} variant="secondary">
                                            {isUpdatingText ? <Loader2 className="animate-spin mr-2" /> : null} Save Extracted Text
                                        </Button>
                                         <Button onClick={() => runAiGrade({ assessmentId: assessment.id })} disabled={isRunningAi || !assessment.rubricName}>
                                            {isRunningAi ? <Loader2 className="animate-spin mr-2" /> : <Lock className="mr-2 h-4 w-4" />} Lock & Send to AI
                                        </Button>
                                    </div>
                                )}
                                {isHandwrittenTextLocked && (
                                    <div className="p-4 border rounded-md bg-muted/50 text-sm">
                                        <p className="font-semibold text-foreground flex items-center"><Lock className="mr-2 h-4 w-4" /> Text Locked</p>
                                        <p className="text-muted-foreground mt-1">Text is now read-only and is being reviewed by the AI.</p>
                                    </div>
                                )}
                                {!assessment.rubricName && !isHandwrittenTextLocked &&
                                    <Alert variant="destructive" className="text-xs">
                                        <AlertDescription>Please select a rubric before sending to AI.</AlertDescription>
                                    </Alert>
                                }
                                </>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function StudentDocumentPanel({ text, suggestions, onApplySuggestion }: { text: string; suggestions: AISuggestion[]; onApplySuggestion: (suggestionId: string, action: 'apply' | 'dismiss') => void; }) {
    
    const getSeverityClass = (severity: AISuggestion['severity']) => {
        const baseClass = "cursor-pointer rounded px-0.5";
        switch(severity) {
            case 'Major': return `${baseClass} bg-yellow-300/60 hover:bg-yellow-300/90`;
            case 'Moderate': return `${baseClass} bg-yellow-200/60 hover:bg-yellow-200/90 underline decoration-dotted`;
            case 'Minor':
            default:
                return `${baseClass} bg-yellow-100/60 hover:bg-yellow-100/90 underline decoration-dashed`;
        }
    }

    const processedText = useMemo(() => {
        if (!suggestions || suggestions.length === 0) {
            return text;
        }

        let lastIndex = 0;
        const parts: (string | JSX.Element)[] = [];
        const sortedSuggestions = [...suggestions].sort((a, b) => a.start - b.start);

        sortedSuggestions.forEach((suggestion) => {
            if (suggestion.start > lastIndex) {
                parts.push(text.substring(lastIndex, suggestion.start));
            }
            const highlightedText = text.substring(suggestion.start, suggestion.end);
            
            parts.push(
                <Popover key={suggestion.id}>
                    <PopoverTrigger asChild>
                        <mark className={getSeverityClass(suggestion.severity)}>
                            {highlightedText}
                        </mark>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <h4 className="font-medium leading-none">{suggestion.criterionName}</h4>
                                <p className="text-sm text-muted-foreground">{suggestion.comment}</p>
                            </div>
                            {suggestion.replacement && (
                                <div className="rounded-md border bg-muted p-2">
                                    <p className="text-sm">Suggest: <span className="font-semibold">{suggestion.replacement}</span></p>
                                </div>
                            )}
                            <div className="flex gap-2">
                                {suggestion.replacement && <Button size="sm" onClick={() => onApplySuggestion(suggestion.id, 'apply')}>Accept</Button>}
                                <Button size="sm" variant="outline" onClick={() => onApplySuggestion(suggestion.id, 'dismiss')}>Dismiss</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            );
            lastIndex = suggestion.end;
        });

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return <>{parts}</>;
    }, [text, suggestions, onApplySuggestion]);
    
    return (
        <div className="h-full rounded-lg bg-card p-4 border flex flex-col">
            <h3 className="text-lg font-semibold mb-1">Student Document</h3>
            <p className="text-sm text-muted-foreground mb-4">The official text for grading.</p>
            <Card className="h-full flex-1">
                <CardContent className="p-4 h-full overflow-y-auto">
                    <div className="prose prose-sm max-w-none">
                         {text ? <p>{processedText}</p> : <p className="text-muted-foreground">Student work will appear here once saved from the left panel.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function GradingPanel({ assessment, onSaveFeedback, onSaveOverride }: { assessment: AssessmentWorkspaceData; onSaveFeedback: (feedback: { notes: string; finalFeedback: string }) => void; onSaveOverride: (overrides: any) => void; }) {
    const [teacherNotes, setTeacherNotes] = useState(assessment.teacherFeedback?.notes || '');
    const [finalFeedback, setFinalFeedback] = useState(assessment.teacherFeedback?.finalFeedback || '');
    const [overrides, setOverrides] = useState(assessment.teacherOverrides || {});
    const { toast } = useToast();
    const assessmentId = resolveAssessmentId(assessment.id);

    const handleOverrideChange = (criterionId: string, field: 'score' | 'note', value: string | number) => {
        const currentOverride = overrides[criterionId] || {};
        const newScore = field === 'score' ? Number(value) : currentOverride.score;
        const newNote = field === 'note' ? String(value) : currentOverride.note || '';
        
        setOverrides((prev: any) => ({
            ...prev,
            [criterionId]: {
                ...prev[criterionId],
                score: newScore,
                note: newNote,
            }
        }));
    };
    
    const onSaveOverridesSuccess = useCallback((data: { overrides: any }) => {
        onSaveOverride(data.overrides);
        toast({ title: "Overrides saved successfully." });
    }, [onSaveOverride, toast]);

    const { trigger: saveOverrides, isLoading: isSavingOverrides } = useWebhook<{ assessmentId: string; overrides: any }, { overrides: any }>({
        eventName: 'ASSESSMENT_SAVE_RUBRIC_OVERRIDE',
        manual: true,
        onSuccess: onSaveOverridesSuccess,
        errorMessage: "Failed to save rubric overrides."
    });

    const onSaveFeedbackSuccess = useCallback(() => {
        onSaveFeedback({ notes: teacherNotes, finalFeedback });
         toast({ title: "Feedback saved successfully." });
    }, [onSaveFeedback, teacherNotes, finalFeedback, toast]);

    const { trigger: saveFeedback, isLoading: isSavingFeedback } = useWebhook<{ assessmentId: string; teacherNotes: string; finalFeedback: string }, {}>({
        eventName: 'ASSESSMENT_SAVE_TEACHER_FEEDBACK',
        manual: true,
        onSuccess: onSaveFeedbackSuccess,
        errorMessage: 'Failed to save feedback.',
    });

    const isFinalized = assessment.status === 'finalized';

    return (
        <div className="h-full rounded-lg bg-card p-4 border flex flex-col">
             <h3 className="text-lg font-semibold mb-1">Rubric Grading & Approval</h3>
            <p className="text-sm text-muted-foreground mb-4">Review AI grades and provide final feedback.</p>
            
            <div className='h-full overflow-y-auto pr-2 space-y-6'>
                {/* Rubric Grades */}
                <div className='space-y-4'>
                    <h4 className='font-semibold'>Rubric Grades (AI Draft)</h4>
                    {assessment.aiReview?.rubricGrades ? (
                        assessment.aiReview.rubricGrades.map(criterion => (
                            <div key={criterion.id} className='p-3 border rounded-md'>
                                <div className='flex justify-between items-start'>
                                    <h5 className="font-semibold">{criterion.criterionName}</h5>
                                    <Badge>AI Score: {criterion.suggestedLevelOrScore}</Badge>
                                </div>
                                <p className="text-xs italic text-muted-foreground mt-1">&quot;{criterion.rationale}&quot;</p>
                                <div className='mt-3 space-y-2'>
                                    <Label className='text-xs'>Teacher Override</Label>
                                    <div className='flex gap-2'>
                                        <Select 
                                            disabled={isFinalized}
                                            onValueChange={(value) => handleOverrideChange(criterion.id, 'score', value)}
                                            value={overrides[criterion.id]?.score?.toString()}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Score" /></SelectTrigger>
                                            <SelectContent>
                                                {[...Array(6).keys()].map(i => <SelectItem key={i} value={String(i)}>{i}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <Input 
                                            placeholder="Note for this criterion..." 
                                            className='text-xs' 
                                            disabled={isFinalized}
                                            value={overrides[criterion.id]?.note || ''}
                                            onChange={(e) => handleOverrideChange(criterion.id, 'note', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : <p className="text-sm text-muted-foreground text-center pt-4">No rubric draft available. Run AI grading first.</p>}
                     {!isFinalized && assessment.aiReview?.rubricGrades && (
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            disabled={isSavingOverrides}
                            onClick={() => saveOverrides({ assessmentId, overrides })}
                        >
                            {isSavingOverrides ? <Loader2 className="animate-spin mr-2" /> : null}
                            Save Overrides
                        </Button>
                     )}
                </div>

                <Separator />

                {/* Final Feedback */}
                <div className="space-y-4">
                     <h4 className='font-semibold'>Final Feedback</h4>
                    <div className="space-y-2">
                        <Label htmlFor="teacher-notes">Teacher Notes (Private)</Label>
                        <Textarea id="teacher-notes" value={teacherNotes} onChange={e => setTeacherNotes(e.target.value)} readOnly={isFinalized} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="final-feedback">Final Feedback for Student</Label>
                        <Textarea id="final-feedback" value={finalFeedback} onChange={e => setFinalFeedback(e.target.value)} readOnly={isFinalized}/>
                    </div>
                    {!isFinalized && (
                        <Button onClick={() => saveFeedback({ assessmentId, teacherNotes, finalFeedback })} disabled={isSavingFeedback}>
                            {isSavingFeedback ? <Loader2 className="animate-spin mr-2" /> : null} Save Feedback
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Main Page Component ---

export default function AssessmentWorkspacePage() {
  const params = useParams<{id: string}>();
    const normalizedRouteAssessmentId = resolveAssessmentId(params.id);
  const [assessmentData, setAssessmentData] = useState<AssessmentWorkspaceData | null>(null);
    const [showUploaderFor, setShowUploaderFor] = useState<'file' | 'image' | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [editableText, setEditableText] = useState<string | null>(null);

    const MOCK_TEXT = `This is a mocked extracted text from the uploaded file. Replace with webhook response when enabled.`;

    const handleAssessmentUpdate = useCallback((data: Partial<AssessmentWorkspaceData>) => {
        setAssessmentData(prev => prev ? { ...prev, ...data } : null);
    }, []);

  const onGetAssessmentSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
    setAssessmentData(data.assessment);
  }, []);

  const { isLoading: isPageLoading, error, trigger: refetch } = useWebhook<{ assessmentId: string }, { assessment: AssessmentWorkspaceData }>({ 
    eventName: 'ASSESSMENT_GET', 
        payload: { assessmentId: normalizedRouteAssessmentId },
    onSuccess: onGetAssessmentSuccess
  });

  const {data: rubricsData, isLoading: rubricsLoading} = useWebhook<{}, { rubrics: RubricListItem[] }>({
      eventName: 'RUBRIC_LIST',
      payload: {},
  });

  const onRunAIGradeSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
      handleAssessmentUpdate(data.assessment);
  }, [handleAssessmentUpdate]);

  const { trigger: runAIGrade } = useWebhook<{ assessmentId: string }, { assessment: AssessmentWorkspaceData }>({
      eventName: 'ASSESSMENT_RUN_AI_GRADE',
      manual: true,
      onSuccess: onRunAIGradeSuccess,
      errorMessage: "Failed to run AI grading. Please try again."
  });

  const onFinalizeSuccess = useCallback((data: { assessment: AssessmentWorkspaceData }) => {
    handleAssessmentUpdate(data.assessment);
  }, [handleAssessmentUpdate]);

  const { trigger: finalizeAssessment } = useWebhook<{ assessmentId: string }, { assessment: AssessmentWorkspaceData }>({
      eventName: 'ASSESSMENT_FINALIZE',
      manual: true,
      onSuccess: onFinalizeSuccess,
      errorMessage: "Failed to finalize assessment."
  });
  
  const onApplySuggestionSuccess = useCallback((data: { newText: string }, payload?: { assessmentId: string; suggestionId: string; action: 'apply' | 'dismiss' }) => {
      setAssessmentData(prev => {
          if (!prev || !payload) return prev;
          
          const updatedSuggestions = prev.aiReview?.suggestions.filter(s => s.id !== payload.suggestionId) ?? [];

          return {
              ...prev,
              currentText: data.newText,
              aiReview: prev.aiReview ? {
                  ...prev.aiReview,
                  suggestions: updatedSuggestions
              } : null,
          };
      });
  }, []);

  const { trigger: applySuggestion } = useWebhook<{ assessmentId: string, suggestionId: string, action: 'apply' | 'dismiss' }, { newText: string }>({
    eventName: 'ASSESSMENT_SUGGESTION_ACTION',
    manual: true,
    onSuccess: onApplySuggestionSuccess,
    errorMessage: "Action failed."
  });
  
  const handleFeedbackSaved = useCallback((feedback: { notes: string; finalFeedback: string }) => {
      setAssessmentData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            teacherFeedback: feedback
        };
    });
  }, []);
  
  const handleOverridesSaved = useCallback((savedOverrides: any) => {
      setAssessmentData(prev => {
        if (!prev) return null;
        return {
            ...prev,
            teacherOverrides: savedOverrides
        };
    });
  }, []);

    const handleRunAI = () => {
        if (assessmentData) {
                runAIGrade({ assessmentId: resolveAssessmentId(assessmentData.id, normalizedRouteAssessmentId) });
        }
    };
  
  const handleFinalize = () => {
    if (assessmentData) {
                finalizeAssessment({ assessmentId: resolveAssessmentId(assessmentData.id, normalizedRouteAssessmentId) });
    }
  };

    if (isPageLoading || rubricsLoading) return <AssessmentWorkspaceSkeleton />;
  
  if (error || !assessmentData) {
    return (
         <div className="p-6">
            <div className="mb-4">
                <Button asChild variant="outline" size="sm">
                    <Link href="/teacher/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
            </div>
            <Alert variant="destructive">
                <X className="h-4 w-4" />
                <AlertTitle>Failed to load workspace</AlertTitle>
                <AlertDescription>
                    There was an error fetching data for this assessment.
                    <div className="mt-4">
                        <Button variant="destructive" onClick={() => refetch()}>Try Again</Button>
                    </div>
                </AlertDescription>
            </Alert>
        </div>
    );
  }

    return (
        <div className="w-full">
            <div className="mb-4 flex items-center justify-between gap-4">
                <WorkspaceHeader data={assessmentData} onRunAI={handleRunAI} onFinalize={handleFinalize} />
            </div>

      <div className="grid grid-cols-12 gap-6 h-[80vh]">
                {/* Left Rail */}
                <div className="col-span-3">
                    <SetupInputPanel 
                        assessment={assessmentData}
                        rubrics={rubricsData?.rubrics || []}
                        onAssessmentUpdate={handleAssessmentUpdate}
                    />
                    {/* Uploader and extracted text preview when a student is selected */}
                    {assessmentData.student && (
                        <div className="mt-4 space-y-3">
                            <div className="flex gap-2">
                                <Button onClick={() => setShowUploaderFor('file')}>Upload File</Button>
                                <Button onClick={() => setShowUploaderFor('image')}>Upload Image</Button>
                            </div>
                            {showUploaderFor && (
                                <FileUploader
                                    acceptedFileTypes={showUploaderFor === 'file' ? {'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt']} : {'image/jpeg': ['.jpeg', '.jpg'], 'image/png': ['.png']}}
                                    onFileSelected={(file) => {
                                        setUploadedFile(file);
                                        // For now, use mock extracted text; later call webhook to extract
                                        setEditableText(MOCK_TEXT);
                                    }}
                                />
                            )}
                            {editableText && (
                                <div>
                                    <Label htmlFor="extracted-text">Extracted Text (Editable)</Label>
                                    <Textarea id="extracted-text" className="h-48" value={editableText} onChange={(e) => setEditableText(e.target.value)} />
                                    <div className="flex gap-2 mt-2">
                                        <Button onClick={() => { /* placeholder: send to webhook/AI */ }}>Send to AI</Button>
                                        <Button variant="secondary" onClick={() => { setEditableText(null); setUploadedFile(null); setShowUploaderFor(null); }}>Reset</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
        {/* Center Panel */}
                <div className="col-span-5">
                    <StudentDocumentPanel text={assessmentData.currentText || ''} suggestions={assessmentData.aiReview?.suggestions || []} onApplySuggestion={(suggestionId, action) => applySuggestion({ assessmentId: resolveAssessmentId(assessmentData.id, normalizedRouteAssessmentId), suggestionId, action })} />
        </div>
        {/* Right Rail */}
        <div className="col-span-4">
          <GradingPanel assessment={assessmentData} onSaveFeedback={handleFeedbackSaved} onSaveOverride={handleOverridesSaved} />
        </div>
      </div>
    </div>
  );
}
