
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { EventName, WebhookRequest, WebhookResponse } from './events';
import { useToast } from '@/hooks/use-toast';
import { devLogger } from './logger';
import { activityTracker } from './activity-tracker';
import { normalizeWebhookActorRole } from './auth';

const FRIENDLY_ERROR_MESSAGE = 'Unable to complete request. Please contact your administrator if this persists.';

interface UseWebhookOptions<P> {
  eventName: EventName;
  payload?: P;
  onSuccess?: (data: any, payload?: P) => void;
  onError?: (error: any) => void;
  errorMessage?: string;
  manual?: boolean; 
  allowEmptyResponse?: boolean;
  allowEchoResponse?: boolean;
  allowRawResponse?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
  cacheStorage?: 'session' | 'local';
  forceRefreshOnMount?: boolean;
  fallbackToCacheOnError?: boolean;
  suppressErrorToast?: boolean;
}

const EMPTY_PAYLOAD = {};
const RUBRIC_EVENTS = new Set<EventName>([
  'RUBRIC_LIST',
  'RUBRIC_GET',
  'ASSESSMENT_SET_RUBRIC',
  'ASSESSMENT_SAVE_RUBRIC_OVERRIDE',
]);

const ACTOR_USERNAME_EXCLUDED_EVENTS = new Set<EventName>([
  'RUBRIC_LIST',
  'RUBRIC_GET',
  'ASSESSMENT_SET_RUBRIC',
  'ASSESSMENT_SAVE_RUBRIC_OVERRIDE',
  'ASSESSMENT_SUBMIT_FOR_AI_REVIEW',
]);

const EMPTY_RESULT_EVENT_NAMES = new Set<EventName>([
  'STUDENT_LIST',
  'STUDENT_REPORTS_LIST',
  'ASSESSMENT_LIST',
  'ASSESSMENT_GET_STUDENTS_FOR_ASSIGNMENT',
  'RUBRIC_LIST',
  'REPORTS_LIST',
  'PARENT_CHILDREN_LIST',
  'PARENT_REPORTS_LIST',
  'GET_REVIEW_QUEUE',
  'GET_DRAFTS',
  'GET_RECENT_ACTIVITY',
  'GET_STUDENT_INSIGHTS',
]);

const READ_EVENT_NAMES = new Set<EventName>([
  ...EMPTY_RESULT_EVENT_NAMES,
  'ASSESSMENT_GET',
  'STUDENT_GET',
  'RUBRIC_GET',
  'REPORT_GET',
  'PARENT_REPORT_GET',
  'GET_DASHBOARD_SUMMARY',
  'HEALTH_CHECK',
  'USER_SETTINGS_GET'
]);

export function useWebhook<P, R>({
  eventName,
  payload: initialPayload = EMPTY_PAYLOAD as P,
  onSuccess,
  onError,
  errorMessage,
  manual = false,
  allowEmptyResponse = false,
  allowEchoResponse = false,
  allowRawResponse = false,
  cacheKey,
  cacheTtlMs = 0,
  cacheStorage = 'local',
  forceRefreshOnMount = false,
  fallbackToCacheOnError = true,
  suppressErrorToast, // Default will be computed based on eventName
}: UseWebhookOptions<P>) {
  const { user, token } = useAuth();
  const payload = useMemo(() => initialPayload, [JSON.stringify(initialPayload)]);
  const resolvedCacheKey = useMemo(() => {
    const userScope = user?.id ? `user:${user.id}` : 'user:anonymous';
    if (cacheKey) {
      return `${cacheKey}:${userScope}`;
    }
    return `webhook:${eventName}:${userScope}:${JSON.stringify(payload ?? {})}`;
  }, [cacheKey, eventName, payload, user?.id]);

  const readCache = useCallback(() => {
    if (!resolvedCacheKey || typeof window === 'undefined') {
      return null;
    }
    const storage = cacheStorage === 'local' ? window.localStorage : window.sessionStorage;
    const rawValue = storage.getItem(resolvedCacheKey);
    if (!rawValue) {
      return null;
    }
    try {
      return JSON.parse(rawValue) as { timestamp: number; data: R };
    } catch (error) {
      storage.removeItem(resolvedCacheKey);
      return null;
    }
  }, [resolvedCacheKey, cacheStorage]);

  const isCacheFresh = useCallback((cached: { timestamp: number } | null) => {
    if (!cached) {
      return false;
    }
    if (!cacheTtlMs) {
      return true;
    }
    return Date.now() - cached.timestamp <= cacheTtlMs;
  }, [cacheTtlMs]);

  const cachedValue = useMemo(() => readCache(), [readCache]);
  const [data, setData] = useState<R | null>(() => (cachedValue && isCacheFresh(cachedValue) ? cachedValue.data : null));
  const [error, setError] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(!manual);
  const { toast } = useToast();

  // Compute suppression: default to true for READ events to avoid "No Data" popups for new users
  const shouldSuppressToast = useMemo(() => {
    if (suppressErrorToast !== undefined) return suppressErrorToast;
    return READ_EVENT_NAMES.has(eventName);
  }, [suppressErrorToast, eventName]);

  const callWebhook = useCallback(async (triggerPayload?: P): Promise<WebhookResponse<R> | void> => {
    if (!user || !token) {
      return Promise.resolve();
    }

    setIsLoading(true);
    setError(null);
    const finalPayload = triggerPayload ?? payload;
    const includePayloadUser = !RUBRIC_EVENTS.has(eventName);
    const includeActorUserName = !ACTOR_USERNAME_EXCLUDED_EVENTS.has(eventName);
    const userName = user.name;

    const enrichedPayload = (() => {
      if (!includePayloadUser || !userName) {
        return finalPayload;
      }
      if (!finalPayload || typeof finalPayload !== 'object' || Array.isArray(finalPayload)) {
        return finalPayload;
      }
      return {
        ...(finalPayload as Record<string, unknown>),
        user: userName,
      } as P;
    })();

    const requestBody: WebhookRequest<P> = {
      eventName,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: {
        role: normalizeWebhookActorRole(user.role),
        userId: user.id,
        ...(includeActorUserName && userName ? { userName } : {}),
      },
      payload: enrichedPayload,
    };

    const parseBackendStatusCode = (message?: string): number | null => {
      if (!message) {
        return null;
      }
      const match = message.match(/backend error:\s*(\d+)/i);
      if (!match) {
        return null;
      }
      const parsed = Number(match[1]);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const isListLikeEvent = EMPTY_RESULT_EVENT_NAMES.has(eventName);

    const getEmptyResultForEvent = (): R => {
      if (isListLikeEvent) {
        return [] as unknown as R;
      }
      return null as unknown as R;
    };

    const isNoDataFailure = (status: number, backendStatus: number | null, errCode?: string, errMessage?: string) => {
      const code = (errCode ?? '').toUpperCase();
      const message = (errMessage ?? '').toLowerCase();
      const statusCode = backendStatus ?? status;
      const noDataStatusCodes = new Set([204, 404, 410, 422]);

      if (noDataStatusCodes.has(statusCode)) {
        return true;
      }

      if (code === 'NOT_FOUND' || code === 'NO_DATA' || code === 'EMPTY_RESULT' || code === 'NOT_CONFIGURED') {
        return true;
      }

      return /no items|no data|not found|empty|no rows|not configured/.test(message);
    };

    const completeWithEmptyResult = () => {
      const emptyData = getEmptyResultForEvent();
      setError(null);
      setData(emptyData);
      if (resolvedCacheKey && typeof window !== 'undefined') {
        const storage = cacheStorage === 'local' ? window.localStorage : window.sessionStorage;
        storage.setItem(resolvedCacheKey, JSON.stringify({ timestamp: Date.now(), data: emptyData }));
      }
      if (onSuccess) {
        onSuccess(emptyData, enrichedPayload);
      }
      const normalizedResponse: WebhookResponse<R> = {
        success: true,
        data: emptyData,
        correlationId: requestBody.requestId,
      };
      return normalizedResponse;
    };
    
    try {
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const rawResponse = await response.text();
      
      let responseData: WebhookResponse<R>;

      const normalizeValue = (value: any): any => {
        if (Array.isArray(value)) {
          return value.map(normalizeValue);
        }
        if (value && typeof value === 'object') {
          return Object.keys(value)
            .sort()
            .reduce<Record<string, any>>((acc, key) => {
              acc[key] = normalizeValue(value[key]);
              return acc;
            }, {});
        }
        return value;
      };

      const isEchoResponse = (value: any): boolean => {
        const normalizedPayload = normalizeValue(enrichedPayload);
        if (Array.isArray(value)) {
          return value.length > 0 && isEchoResponse(value[0]);
        }
        return JSON.stringify(normalizeValue(value)) === JSON.stringify(normalizedPayload);
      };

      if (rawResponse) {
        const trimmedResponse = rawResponse.trim();
        if (response.ok && trimmedResponse.toLowerCase() === 'success') {
          responseData = {
            success: true,
            data: undefined,
            correlationId: requestBody.requestId,
          };
        } else {
          try {
            const parsedResponse = JSON.parse(rawResponse);
            if (allowEchoResponse && response.ok && isEchoResponse(parsedResponse)) {
              responseData = {
                success: true,
                data: undefined,
                correlationId: requestBody.requestId,
              };
            } else if (response.ok && (Array.isArray(parsedResponse) || parsedResponse?.success === undefined)) {
              responseData = {
                success: true,
                data: parsedResponse as R,
                correlationId: requestBody.requestId,
              };
            } else if (allowRawResponse && response.ok && !parsedResponse?.success) {
              responseData = {
                success: true,
                data: parsedResponse as R,
                correlationId: requestBody.requestId,
              };
            } else {
              responseData = parsedResponse as WebhookResponse<R>;
            }
          } catch (parseError) {
            if (allowEmptyResponse && response.ok) {
              responseData = {
                success: true,
                data: undefined,
                correlationId: requestBody.requestId,
              };
            } else {
              throw parseError;
            }
          }
        }
      } else if (allowEmptyResponse && response.ok) {
        responseData = {
          success: true,
          data: undefined,
          correlationId: requestBody.requestId,
        };
      } else if (READ_EVENT_NAMES.has(eventName) || allowEmptyResponse) {
        responseData = {
          success: true,
          data: getEmptyResultForEvent(),
          correlationId: requestBody.requestId,
        };
      } else {
        throw new Error('Empty response body.');
      }
      
      devLogger.log({
          timestamp: new Date().toISOString(),
          eventName,
          request: requestBody,
          response: responseData,
          status: responseData.success ? 'success' : 'error',
          correlationId: responseData.correlationId,
      });

      if (!response.ok || !responseData.success) {
        const errMessage = responseData.error?.message || `Backend returned error ${response.status}`;
        const errCode = responseData.error?.code;
        const backendStatus = parseBackendStatusCode(errMessage);
        
        // INTERCEPT NO DATA AS SUCCESS
        if (READ_EVENT_NAMES.has(eventName) && isNoDataFailure(response.status, backendStatus, errCode, errMessage)) {
          return completeWithEmptyResult();
        }
        
        const error = new Error(errMessage);
        setError(error);
        
        if (onError) {
          onError(error);
        }
        
        if (!shouldSuppressToast) {
          toast({
            variant: 'destructive',
            title: 'System Notice',
            description: errorMessage || FRIENDLY_ERROR_MESSAGE,
          });
        }
        return responseData;
      }

      // --- ACTIVITY ENGINE INTERCEPTOR ---
      const mutationEvents: Record<string, (p: any) => { type: any, title: string, subtitle: string }> = {
        'STUDENT_CREATE': (p) => ({ 
          type: 'student_added', 
          title: `${p.name || 'New student'} enrolled in roster`, 
          subtitle: 'Academic profile created' 
        }),
        'ASSESSMENT_FINALIZE': (p) => ({ 
          type: 'assessment_finalized', 
          title: `${p.student_name || 'Student'}, ${p.assignment_title || 'Assessment'}, grading successful`, 
          subtitle: `Finalized by ${userName || 'Teacher'}` 
        }),
        'REPORT_GENERATE': (p) => ({ 
          type: 'report_generated', 
          title: `Academic report compiled for ${p.studentId}`, 
          subtitle: 'Synchronized with portal' 
        }),
        'ASSESSMENT_CREATE_DRAFT': (p) => ({ 
          type: 'assessment_created', 
          title: `New assignment draft: ${p.title}`, 
          subtitle: 'Ready for classroom use' 
        }),
        'PARENT_REPORT_OPENED': (p) => ({
            type: 'report_generated',
            title: `Parent viewed ${p.studentName || 'Student'}'s report`,
            subtitle: 'Read confirmation received'
        })
      };

      if (mutationEvents[eventName]) {
        const info = mutationEvents[eventName](finalPayload);
        activityTracker.add(info.type, info.title, info.subtitle);
      }

      setData(responseData.data as R);
      if (resolvedCacheKey && typeof window !== 'undefined') {
        const storage = cacheStorage === 'local' ? window.localStorage : window.sessionStorage;
        storage.setItem(resolvedCacheKey, JSON.stringify({ timestamp: Date.now(), data: responseData.data }));
      }
      if (onSuccess) {
        onSuccess(responseData.data, enrichedPayload);
      }
      return responseData;
    } catch (err: any) {
      const message = String(err?.message ?? '').toLowerCase();
      
      // INTERCEPT NO DATA IN CATCH BLOCK
      if (READ_EVENT_NAMES.has(eventName) && /no items|no data|not found|empty|no rows|not configured/.test(message)) {
        return completeWithEmptyResult();
      }
      
      if (fallbackToCacheOnError) {
        const latestCache = readCache();
        if (latestCache && isCacheFresh(latestCache)) {
          setData(latestCache.data);
          setError(null);
          setIsLoading(false);
          return;
        }
      }
      setError(err);
      if (onError) {
        onError(err);
      }
      if (!shouldSuppressToast) {
        toast({
          variant: 'destructive',
          title: 'Connection Notice',
          description: errorMessage || FRIENDLY_ERROR_MESSAGE,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    eventName, 
    payload, 
    onSuccess, 
    onError, 
    toast, 
    user, 
    token, 
    errorMessage, 
    allowEmptyResponse, 
    allowEchoResponse, 
    allowRawResponse, 
    fallbackToCacheOnError, 
    shouldSuppressToast,
    readCache, 
    isCacheFresh, 
    resolvedCacheKey, 
    cacheStorage
  ]);

  useEffect(() => {
    if (!manual) {
      callWebhook();
    }
  }, [manual, callWebhook]);

  const trigger = useCallback(async (triggerPayload?: P) => {
    return await callWebhook(triggerPayload);
  }, [callWebhook]);

  return { data, error, isLoading, trigger };
}
