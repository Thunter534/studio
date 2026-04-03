'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { EventName, WebhookRequest, WebhookResponse } from './events';
import { useToast } from '@/hooks/use-toast';
import { devLogger } from './logger';
import { activityTracker } from './activity-tracker';
import { normalizeWebhookActorRole } from './auth';

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
  suppressErrorToast = false,
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
    
    try {
      console.log(`[useWebhook] ${eventName} - Sending request:`, requestBody);
      const response = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const rawResponse = await response.text();
      console.log(`[useWebhook] ${eventName} - Raw response status=${response.status}`);
      
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
            console.error(`[useWebhook] ${eventName} - JSON parse error:`, parseError);
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
        console.error(`[useWebhook] ${eventName} - Webhook failure:`, { 
          status: response.status, 
          success: responseData.success, 
          error: responseData.error 
        });
        
        const error = new Error(errMessage);
        setError(error);
        
        if (onError) {
          onError(error);
        }
        
        if (!suppressErrorToast) {
          toast({
            variant: 'destructive',
            title: 'Sync Error',
            description: errorMessage || errMessage,
          });
        }
        return responseData;
      }

      // --- ACTIVITY ENGINE INTERCEPTOR ---
      const mutationEvents: Record<string, (p: any) => { type: any, title: string, subtitle: string }> = {
        'STUDENT_CREATE': (p) => ({ 
          type: 'student_added', 
          title: 'New Student Added', 
          subtitle: `${p.name} enrolled` 
        }),
        'ASSESSMENT_FINALIZE': (p) => ({ 
          type: 'assessment_finalized', 
          title: 'Grading Successful', 
          subtitle: `${p.student_name || 'Student'} · ${p.assignment_title || 'Assessment'}` 
        }),
        'REPORT_GENERATE': (p) => ({ 
          type: 'report_generated', 
          title: 'Report Compiled', 
          subtitle: `Summary for student ${p.studentId}` 
        }),
        'ASSESSMENT_CREATE_DRAFT': (p) => ({ 
          type: 'assessment_created', 
          title: 'New Assignment Created', 
          subtitle: `${p.title}` 
        }),
      };

      if (mutationEvents[eventName]) {
        const info = mutationEvents[eventName](finalPayload);
        activityTracker.add(info.type, info.title, info.subtitle);
      }

      console.log(`[useWebhook] ${eventName} - Success`);
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
      console.error(`[useWebhook] ${eventName} - Exception:`, err);
      if (fallbackToCacheOnError) {
        const latestCache = readCache();
        if (latestCache && isCacheFresh(latestCache)) {
          console.log(`[useWebhook] ${eventName} - Using cached data as fallback`);
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
      if (!suppressErrorToast) {
        toast({
          variant: 'destructive',
          title: 'Connection Error',
          description: errorMessage || err.message || 'Could not connect to the server.',
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
    suppressErrorToast,
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
