import { type NextRequest, NextResponse } from 'next/server';
import type { WebhookRequest, WebhookResponse } from '@/lib/events';
import { getWebhookUrl } from '@/lib/webhook-config';
import { requestAiEvaluation } from '@/lib/ai-evaluation';

export const maxDuration = 35;
 
function normalizeActorRole(role: unknown): 'teacher' | 'parent' | null {
  if (typeof role !== 'string') {
    return null;
  }
  const lowered = role.trim().toLowerCase();
  if (lowered === 'teacher' || lowered === 'admin') {
    return 'teacher';
  }
  if (lowered === 'parent') {
    return 'parent';
  }
  return null;
}
 
export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequest = await req.json();

    if (body.eventName === 'ASSESSMENT_SUBMIT_FOR_AI_REVIEW') {
      const aiResult = await requestAiEvaluation((body as any).payload);
      const correlationId = body.requestId || 'ai-review-' + Date.now();

      if (!aiResult.ok) {
        return NextResponse.json<WebhookResponse>({
          success: false,
          error: {
            message: aiResult.message,
            code: aiResult.code,
          },
          correlationId,
        }, { status: aiResult.status });
      }

      return NextResponse.json<WebhookResponse>({
        success: true,
        data: {
          evaluation: aiResult.evaluation,
          text: aiResult.evaluation,
        },
        correlationId,
      });
    }
 
    // Standard live events list prior to diagnostic expansion
    const liveEvents = [
      'STUDENT_LIST',
      'STUDENT_GET',
      'STUDENT_CREATE',
      'STUDENT_REPORTS_LIST',
      'ASSESSMENT_LIST',
      'ASSESSMENT_GET',
      'ASSESSMENT_CREATE_DRAFT',
      'ASSESSMENT_FINALIZE',
      'ASSESSMENT_MARK_COMPLETE',
      'RUBRIC_LIST',
      'REPORTS_LIST',
      'REPORT_GET',
      'REPORT_GENERATE'
    ];
 
    const webhookUrl = getWebhookUrl(body.eventName);
 
    if (!webhookUrl) {
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: {
          message: `Endpoint not configured for ${body.eventName}.`,
          code: 'NOT_CONFIGURED',
        },
        correlationId: 'error-' + Date.now(),
      }, { status: 404 });
    }
 
    const bodyActor = (body as any)?.actor ?? {};
    const bodyPayload = (body as any)?.payload;
    const resolvedUserName = bodyActor.userName || bodyPayload?.user || null;
    const resolvedUserId = bodyActor.userId || null;
    const resolvedUserRole = normalizeActorRole(bodyActor.role);
 
    const enrichedBody = resolvedUserName
      ? {
          ...(body as any),
          actor: {
            ...bodyActor,
            ...(resolvedUserRole ? { role: resolvedUserRole } : {}),
            ...(resolvedUserId ? { userId: resolvedUserId } : {}),
            userName: resolvedUserName,
          },
          payload: bodyPayload && typeof bodyPayload === 'object' && !Array.isArray(bodyPayload)
            ? {
                ...bodyPayload,
                user: resolvedUserName,
              }
            : bodyPayload,
        }
      : body;
 
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.get('Authorization') ? { 'Authorization': req.headers.get('Authorization') as string } : {}),
      },
      body: JSON.stringify(enrichedBody),
    });
 
    if (!n8nResponse.ok) {
        return NextResponse.json<WebhookResponse>({
            success: false,
            error: {
                message: `Backend error: ${n8nResponse.status}`,
                code: 'BACKEND_ERROR',
            },
            correlationId: 'n8n-error-' + Date.now(),
        }, { status: 502 });
    }
 
    const responseData: WebhookResponse = await n8nResponse.json();
    return NextResponse.json(responseData);
 
  } catch (error) {
    return NextResponse.json<WebhookResponse>({
      success: false,
      error: { message: 'Gateway error occurred.', code: 'INTERNAL_ERROR' },
      correlationId: 'gateway-error-' + Date.now(),
    }, { status: 500 });
  }
}
 
