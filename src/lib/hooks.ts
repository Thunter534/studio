'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import type { EventName, WebhookRequest, WebhookResponse } from './events';
import { useToast } from '@/hooks/use-toast';
import { devLogger } from './logger';

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
  const payload = useMemo(() => initialPayload, [JSON.stringify(initialPayload)]);
  const resolvedCacheKey = useMemo(() => {
    if (cacheKey) {
      return cacheKey;
    }
    return `webhook:${eventName}:${JSON.stringify(payload ?? {})}`;
  }, [cacheKey, eventName, payload]);

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
  const { user, token } = useAuth();
  const { toast } = useToast();

  const callWebhook = useCallback(async (triggerPayload?: P): Promise<WebhookResponse<R> | void> => {
    if (!user || !token) {
      return Promise.resolve();
    }

    setIsLoading(true);
    setError(null);
    const finalPayload = triggerPayload ?? payload;

    const requestBody: WebhookRequest<P> = {
      eventName,
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor: {
        role: user.role,
        userId: user.id,
      },
      payload: finalPayload,
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
      console.log(`[useWebhook] ${eventName} - Raw response status=${response.status}, body=${rawResponse.substring(0, 500)}`);
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
        const normalizedPayload = normalizeValue(finalPayload);
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
          console.log(`[useWebhook] ${eventName} - Parsed JSON response:`, parsedResponse);
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
          console.error(`[useWebhook] ${eventName} - JSON parse error:`, parseError, 'Raw response:', rawResponse.substring(0, 500));
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
      
      console.log(`[useWebhook] ${eventName} - Parsed responseData:`, responseData);
      
      devLogger.log({
          timestamp: new Date().toISOString(),
          eventName,
          request: requestBody,
          response: responseData,
          status: responseData.success ? 'success' : 'error',
          correlationId: responseData.correlationId,
      });

      if (!response.ok || !responseData.success) {
        const errMessage = responseData.error?.message || 'An unknown error occurred';
        console.log(`[useWebhook] ${eventName} - Error response:`, { status: response.status, success: responseData.success, error: responseData.error, data: responseData.data });
        throw new Error(errMessage);
      }

      console.log(`[useWebhook] ${eventName} - Success. Data:`, responseData.data);
      setData(responseData.data as R);
      if (resolvedCacheKey && typeof window !== 'undefined') {
        const storage = cacheStorage === 'local' ? window.localStorage : window.sessionStorage;
        storage.setItem(resolvedCacheKey, JSON.stringify({ timestamp: Date.now(), data: responseData.data }));
      }
      if (onSuccess) {
        onSuccess(responseData.data, finalPayload);
      }
      return responseData;
    } catch (err: any) {
      console.error(`[useWebhook] ${eventName} - Error caught:`, err);
      if (fallbackToCacheOnError) {
        const latestCache = readCache();
        if (latestCache && isCacheFresh(latestCache)) {
          console.log(`[useWebhook] ${eventName} - Using cached data as fallback`, latestCache.data);
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
          title: 'Error',
          description: errorMessage || err.message,
        });
      }
      return Promise.reject(err);
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

  const shouldSkipAutoFetch = manual;

  useEffect(() => {
    if (!manual && !shouldSkipAutoFetch) {
      console.log(`[useWebhook] ${eventName} - Triggering fetch. forceRefreshOnMount=${forceRefreshOnMount}, manual=${manual}, shouldSkipAutoFetch=${shouldSkipAutoFetch}`);
      callWebhook();
    } else {
      console.log(`[useWebhook] ${eventName} - Skipping fetch. manual=${manual}, shouldSkipAutoFetch=${shouldSkipAutoFetch}, forceRefreshOnMount=${forceRefreshOnMount}`);
    }
  }, [manual, shouldSkipAutoFetch, callWebhook, eventName, forceRefreshOnMount]);

  const trigger = useCallback(async (triggerPayload?: P) => callWebhook(triggerPayload), [callWebhook]);

  return { data, error, isLoading, trigger };
}
