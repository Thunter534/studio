"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { normalizeAssessmentIdentifier } from "@/lib/utils";

const N8N_ASSESSMENT_LIST_WEBHOOK = 'https://n8n.srv1336679.hstgr.cloud/webhook/843732eb-f3ca-45c7-b841-08cd7131944c';
const N8N_ASSESSMENT_GET_WEBHOOK = 'https://n8n.srv1336679.hstgr.cloud/webhook/bdb41ebb-b815-4885-8d93-d5ed1186e436';
const ASSESSMENT_GET_CACHE_KEY_PREFIX = 'n8n:assessment:get:';
const ASSESSMENT_LIST_CACHE_KEY = 'n8n:assessment:list';
const DOCUMENT_TEXT_CACHE_KEY_PREFIX = 'n8n:document:text:';

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const assessmentId = params.id;
  const { toast } = useToast();
  const router = useRouter();

  const [assessmentData, setAssessmentData] = useState<{ assessment: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editableText, setEditableText] = useState<string>("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [rubricName, setRubricName] = useState<string | null>(null);
  const [assignmentTitle, setAssignmentTitle] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionStorageUsed = React.useRef(false);
  const normalizedAssessmentName = normalizeAssessmentIdentifier(assessmentId);
  const titleFromId = normalizedAssessmentName;

  useEffect(() => {
    const fetchAssessment = async () => {
      const storedTitle = typeof window !== 'undefined'
        ? sessionStorage.getItem('currentAssignmentTitle')
        : null;
      const title = titleFromId || storedTitle || assignmentTitle;
      const requestAssessmentId = normalizedAssessmentName ?? assessmentId ?? null;
      const cacheKey = assessmentId
        ? `${ASSESSMENT_GET_CACHE_KEY_PREFIX}id:${assessmentId}`
        : title
          ? `${ASSESSMENT_GET_CACHE_KEY_PREFIX}title:${title}`
          : null;
      if (!assessmentId && !title) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(N8N_ASSESSMENT_GET_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assessmentId: requestAssessmentId,
            assessment_id: requestAssessmentId,
            title,
            assessment_title: title,
            payload: {
              assessmentId: requestAssessmentId,
              assessment_id: requestAssessmentId,
              title,
              assessment_title: title,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawBody = await response.text();
        if (!rawBody) {
          throw new Error('Empty response body');
        }

        let result: any;
        try {
          result = JSON.parse(rawBody);
        } catch (parseError) {
          console.warn('[Document] Non-JSON response from assessment-get:', rawBody);
          throw parseError;
        }
        const rawItems = Array.isArray(result)
          ? result
          : result?.data?.items || result?.data?.assessments || result?.items || result?.assessments;

        if (Array.isArray(rawItems)) {
          const matched = rawItems.find((item: any) => {
            const candidate = (item.title ?? item.name ?? '').toString().trim().toLowerCase();
            return candidate === title.trim().toLowerCase();
          });
          if (matched) {
            setAssessmentData({ assessment: matched });
            if (cacheKey && typeof window !== 'undefined') {
              window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: matched }));
            }
            const resolvedRubricName = matched.rubricName
              ?? matched.rubric_name
              ?? matched.rubricId
              ?? matched.rubric_id
              ?? matched.rubric
              ?? null;
            if (resolvedRubricName) {
              setRubricName(resolvedRubricName);
            }
          }
          return;
        }

        const assessmentCandidate = result?.data ?? result?.assessment ?? result;
        if (assessmentCandidate && typeof assessmentCandidate === 'object') {
          setAssessmentData({ assessment: assessmentCandidate });
          if (cacheKey && typeof window !== 'undefined') {
            window.localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: assessmentCandidate }));
          }
          const resolvedRubricName = assessmentCandidate.rubricName
            ?? assessmentCandidate.rubric_name
            ?? assessmentCandidate.rubricId
            ?? assessmentCandidate.rubric_id
            ?? assessmentCandidate.rubric
            ?? null;
          if (resolvedRubricName) {
            setRubricName(resolvedRubricName);
          }
        }
      } catch (error) {
        console.warn('[Document] Failed to fetch assessment:', error);
        if (cacheKey && typeof window !== 'undefined') {
          const cachedValue = window.localStorage.getItem(cacheKey);
          if (cachedValue) {
            try {
              const cached = JSON.parse(cachedValue) as { timestamp: number; data: any };
              if (cached?.data) {
                setAssessmentData({ assessment: cached.data });
                const resolvedRubricName = cached.data.rubricName
                  ?? cached.data.rubric_name
                  ?? cached.data.rubricId
                  ?? cached.data.rubric_id
                  ?? cached.data.rubric
                  ?? null;
                if (resolvedRubricName) {
                  setRubricName(resolvedRubricName);
                }
              }
            } catch {
              window.localStorage.removeItem(cacheKey);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssessment();
  }, [assignmentTitle]);

  useEffect(() => {
    const fetchRubricForAssessment = async () => {
      if (!assessmentId) {
        return;
      }

      if (rubricName) {
        return;
      }

      try {
        const storedTitle = typeof window !== 'undefined'
          ? sessionStorage.getItem('currentAssignmentTitle')
          : null;
        const fallbackTitle = storedTitle || assignmentTitle || assessmentData?.assessment?.title || null;

        const response = await fetch(N8N_ASSESSMENT_LIST_WEBHOOK, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const rawItems = Array.isArray(result)
          ? result
          : result?.data?.items || result?.data?.assessments || result?.items || result?.assessments;

        if (!Array.isArray(rawItems)) {
          return;
        }

        const matched = rawItems.find((item: any) => {
          const id = item.id ?? item.assessment_id ?? item.assessmentId ?? item.assignment_id ?? item.assignmentId;
          return id === assessmentId;
        }) ?? rawItems.find((item: any) => {
          if (!fallbackTitle) {
            return false;
          }
          const title = (item.title ?? item.name ?? '').toString().trim().toLowerCase();
          return title === fallbackTitle.trim().toLowerCase();
        });

        if (matched) {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(ASSESSMENT_LIST_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: rawItems }));
          }
          setRubricName(matched.rubricName ?? matched.rubric_name ?? matched.rubricId ?? matched.rubric_id ?? matched.rubric ?? null);
        }
      } catch (error) {
        console.warn('[Document] Failed to fetch rubric info:', error);
        if (typeof window !== 'undefined') {
          const cachedValue = window.localStorage.getItem(ASSESSMENT_LIST_CACHE_KEY);
          if (cachedValue) {
            try {
              const cached = JSON.parse(cachedValue) as { timestamp: number; data: any[] };
              if (Array.isArray(cached?.data)) {
                const storedTitle = sessionStorage.getItem('currentAssignmentTitle');
                const fallbackTitle = storedTitle || assignmentTitle || assessmentData?.assessment?.title || null;
                const matched = cached.data.find((item: any) => {
                  if (!fallbackTitle) {
                    return false;
                  }
                  const title = (item.title ?? item.name ?? '').toString().trim().toLowerCase();
                  return title === fallbackTitle.trim().toLowerCase();
                });
                if (matched) {
                  setRubricName(matched.rubricName ?? matched.rubric_name ?? matched.rubricId ?? matched.rubric_id ?? matched.rubric ?? null);
                }
              }
            } catch {
              window.localStorage.removeItem(ASSESSMENT_LIST_CACHE_KEY);
            }
          }
        }
      }
    };

    fetchRubricForAssessment();
  }, [assessmentId, assignmentTitle, assessmentData?.assessment?.title]);

  useEffect(() => {
    // Try to get extracted text and studentId from sessionStorage first
    const storedText = typeof window !== 'undefined'
      ? sessionStorage.getItem('extractedText')
      : null;
    if (typeof window !== 'undefined') {
      const stored = storedText;
      const storedStudentId = sessionStorage.getItem('currentStudentId');
      const storedStudentName = sessionStorage.getItem('currentStudentName');
      const storedRubricName = sessionStorage.getItem('currentRubricName');
      const storedAssignmentTitle = sessionStorage.getItem('currentAssignmentTitle');
      
      if (stored) {
        setEditableText(stored);
        sessionStorageUsed.current = true;
        sessionStorage.removeItem('extractedText');
      }
      
      if (storedStudentId) {
        setStudentId(storedStudentId);
        sessionStorage.removeItem('currentStudentId');
      }

      if (storedStudentName) {
        setStudentName(storedStudentName);
      }

      if (normalizedAssessmentName) {
        setAssignmentTitle(normalizedAssessmentName);
        sessionStorage.setItem('currentAssignmentTitle', normalizedAssessmentName);
      } else if (storedAssignmentTitle) {
        setAssignmentTitle(storedAssignmentTitle);
      }

      if (storedRubricName) {
        setRubricName(storedRubricName);
      }
    }
    if (typeof window !== 'undefined' && !storedText) {
      const cacheKey = `${DOCUMENT_TEXT_CACHE_KEY_PREFIX}${normalizedAssessmentName ?? assessmentId ?? 'unknown'}`;
      const cachedText = window.localStorage.getItem(cacheKey);
      if (cachedText) {
        setEditableText(cachedText);
      }
    }
    // Fall back to assessment data only if we didn't use sessionStorage
    if (!sessionStorageUsed.current && assessmentData?.assessment?.currentText) {
      setEditableText(assessmentData.assessment.currentText);
    }
    
    // Also try to get studentId from assessment data if not in sessionStorage
    if (!studentId && assessmentData?.assessment?.student?.id) {
      setStudentId(assessmentData.assessment.student.id);
    }

    if (!studentName && assessmentData?.assessment?.student?.name) {
      setStudentName(assessmentData.assessment.student.name);
    }

    if (!rubricName && assessmentData?.assessment?.rubricName) {
      setRubricName(assessmentData.assessment.rubricName);
    }

    // Debug: Log full assessment data structure
    if (assessmentData?.assessment) {
      console.log('[Document] Full assessment object:', JSON.stringify(assessmentData.assessment, null, 2));
    }
  }, [assessmentData, studentId, rubricName, studentName]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const cacheKey = `${DOCUMENT_TEXT_CACHE_KEY_PREFIX}${normalizedAssessmentName ?? assessmentId ?? 'unknown'}`;
    if (editableText) {
      window.localStorage.setItem(cacheKey, editableText);
    } else {
      window.localStorage.removeItem(cacheKey);
    }
  }, [editableText, normalizedAssessmentName, assessmentId]);

  const handleSubmit = async () => {
    console.log('[Document] Starting submission...');
    console.log('[Document] Assessment data:', assessmentData);
    console.log('[Document] Student ID:', studentId);
    console.log('[Document] Editable text length:', editableText?.length);

    if (!assessmentData?.assessment) {
      console.error('[Document] Assessment data not loaded');
      toast({ variant: 'destructive', title: 'Error', description: 'Assessment data not loaded' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof window !== 'undefined') {
        if (studentId || assessmentData.assessment.student?.id) {
          sessionStorage.setItem('currentStudentId', studentId || assessmentData.assessment.student?.id);
        }
        if (assessmentData.assessment.student?.name) {
          sessionStorage.setItem('currentStudentName', assessmentData.assessment.student.name);
        }
        const resolvedTitle = normalizedAssessmentName || assignmentTitle || assessmentData.assessment.title;
        if (resolvedTitle) {
          sessionStorage.setItem('currentAssignmentTitle', resolvedTitle);
        }
      }
      // Prepare payload for n8n webhook
      const payload = {
        assessmentId: normalizedAssessmentName ?? assessmentId,
        studentId: studentId || assessmentData.assessment.student?.id,
        extractedText: editableText,
        rubricName: rubricName
          || assessmentData.assessment.rubricName
          || assessmentData.assessment.rubric_name
          || assessmentData.assessment.rubricId
          || assessmentData.assessment.rubric_id
          || assessmentData.assessment.rubric,
        criteria: assessmentData.assessment.criteria || [],
      };

      console.log('[Document] Payload being sent:', payload);

      const response = await fetch('https://n8n.srv1336679.hstgr.cloud/webhook/6ac67b0a-3b19-4350-b349-1f838fdf21e9', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[Document] Response status:', response.status);
      console.log('[Document] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Document] Error response:', errorText);
        throw new Error('Failed to submit for AI review');
      }

      const result = await response.json();
      console.log('[Document] Success response:', result);

      const extractAiTextFromResult = (value: any): string | null => {
        if (!value) {
          return null;
        }
        const extractFromParts = (parts: any[]): string => {
          return parts
            .map((part) => (typeof part?.text === 'string' ? part.text : ''))
            .filter(Boolean)
            .join('\n');
        };
        if (typeof value === 'string') {
          return value;
        }
        if (Array.isArray(value)) {
          const first = value[0];
          const parts = first?.content?.parts ?? first?.parts;
          if (Array.isArray(parts)) {
            const extracted = extractFromParts(parts);
            if (extracted) {
              return extracted;
            }
          }
          return null;
        }
        const parts = value?.content?.parts ?? value?.parts;
        if (Array.isArray(parts)) {
          const extracted = extractFromParts(parts);
          if (extracted) {
            return extracted;
          }
        }
        if (typeof value?.text === 'string') {
          return value.text;
        }
        return null;
      };

      if (typeof window !== 'undefined') {
        const aiText = extractAiTextFromResult(result);
        if (aiText) {
          sessionStorage.setItem('currentAiOutput', aiText);
        }
      }

      toast({ title: 'Submitted', description: 'Text sent for AI review. Redirecting...' });
      setTimeout(() => router.push(`/teacher/assessments/${assessmentId}/grading`), 600);
    } catch (error) {
      console.error('[Document] Submission error:', error);
      toast({ variant: 'destructive', title: 'Submission failed', description: 'Failed to submit text for review.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader>
          <CardTitle>Student Document</CardTitle>
          <CardDescription>Editable student text.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="extracted-text">Extracted Text (Editable)</Label>
              <Textarea id="extracted-text" className="h-64" value={editableText} onChange={(e) => setEditableText(e.target.value)} />
            </div>


            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={isSubmitting || isLoading}>{isSubmitting ? 'Submitting...' : 'Submit'}</Button>
              <Button variant="secondary" onClick={() => setEditableText(assessmentData?.assessment?.currentText ?? '')}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
