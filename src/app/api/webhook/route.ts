import { type NextRequest, NextResponse } from 'next/server';
import type { WebhookRequest, WebhookResponse } from '@/lib/events';
import { getWebhookUrl } from '@/lib/webhook-config';

const RUBRIC_EVENTS = new Set([
  'RUBRIC_LIST',
  'RUBRIC_GET',
  'ASSESSMENT_SET_RUBRIC',
  'ASSESSMENT_SAVE_RUBRIC_OVERRIDE',
]);

const ACTOR_USERNAME_EXCLUDED_EVENTS = new Set([
  'RUBRIC_LIST',
  'RUBRIC_GET',
  'ASSESSMENT_SET_RUBRIC',
  'ASSESSMENT_SAVE_RUBRIC_OVERRIDE',
  'ASSESSMENT_SUBMIT_FOR_AI_REVIEW',
]);

function decodeUserNameFromBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as { name?: string };
    return typeof payload.name === 'string' ? payload.name : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequest = await req.json();

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

    const authToken = req.headers.get('Authorization');

    if (!authToken) {
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        correlationId: 'auth-error-' + Date.now(),
      }, { status: 401 });
    }

    const tokenUserName = decodeUserNameFromBearerToken(authToken);
    const bodyActor = (body as any)?.actor ?? {};
    const bodyPayload = (body as any)?.payload;
    const resolvedUserName = tokenUserName || bodyActor.userName || bodyPayload?.user || null;
    const isRubricEvent = RUBRIC_EVENTS.has(body.eventName as string);
    const includePayloadUser = !isRubricEvent;
    const includeActorUserName = !ACTOR_USERNAME_EXCLUDED_EVENTS.has(body.eventName as string);

    const enrichedBody = resolvedUserName && (includePayloadUser || includeActorUserName)
      ? {
          ...(body as any),
          ...(includeActorUserName
            ? {
                actor: {
                  ...bodyActor,
                  userName: resolvedUserName,
                },
              }
            : {}),
          ...(includePayloadUser
            ? {
                payload: bodyPayload && typeof bodyPayload === 'object' && !Array.isArray(bodyPayload)
                  ? {
                      ...bodyPayload,
                      user: resolvedUserName,
                    }
                  : bodyPayload,
              }
            : {}),
        }
      : body;

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
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
