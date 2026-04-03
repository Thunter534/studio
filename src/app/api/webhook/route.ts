import { type NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { WebhookRequest, WebhookResponse } from '@/lib/events';
import { getWebhookUrl } from '@/lib/webhook-config';
import { extractRoleFromClaims } from '@/lib/auth';

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

type VerifiedToken = {
  token: string;
  payload: JWTPayload;
};

function getIssuer(): string {
  const explicitIssuer = process.env.COGNITO_ISSUER?.trim();
  if (explicitIssuer) {
    return explicitIssuer;
  }

  const region = process.env.COGNITO_REGION?.trim();
  const userPoolId = process.env.COGNITO_USER_POOL_ID?.trim();
  if (!region || !userPoolId) {
    throw new Error('Missing Cognito env. Set COGNITO_ISSUER or COGNITO_REGION + COGNITO_USER_POOL_ID.');
  }
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
}

async function verifyAuthorizationHeader(authHeader: string | null): Promise<VerifiedToken | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  const issuer = getIssuer();
  const clientId = process.env.COGNITO_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error('Missing COGNITO_CLIENT_ID environment variable.');
  }

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const { payload } = await jwtVerify(token, jwks, {
    issuer,
    algorithms: ['RS256'],
  });

  const audienceMatches = payload.aud === clientId || payload.client_id === clientId;
  if (!audienceMatches) {
    throw new Error('Token audience is invalid.');
  }

  return { token, payload };
}

function usernameFromVerifiedPayload(payload: JWTPayload): string | null {
  if (typeof payload.name === 'string') {
    return payload.name;
  }
  if (typeof payload.email === 'string') {
    return payload.email;
  }
  if (typeof payload['cognito:username'] === 'string') {
    return payload['cognito:username'];
  }
  return null;
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

    let verified: VerifiedToken | null = null;
    try {
      verified = await verifyAuthorizationHeader(req.headers.get('Authorization'));
    } catch {
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        correlationId: 'auth-error-' + Date.now(),
      }, { status: 401 });
    }

    if (!verified) {
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        correlationId: 'auth-error-' + Date.now(),
      }, { status: 401 });
    }

    const tokenUserName = usernameFromVerifiedPayload(verified.payload);
    const tokenUserId = typeof verified.payload.sub === 'string' ? verified.payload.sub : null;
    const tokenRole = extractRoleFromClaims(verified.payload as Record<string, unknown>);
    const bodyActor = (body as any)?.actor ?? {};
    const bodyPayload = (body as any)?.payload;
    const resolvedUserName = tokenUserName || bodyActor.userName || bodyPayload?.user || null;
    const resolvedUserId = tokenUserId || bodyActor.userId || null;
    const resolvedUserRole = normalizeActorRole(tokenRole) ?? normalizeActorRole(bodyActor.role);
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
                  ...(resolvedUserRole ? { role: resolvedUserRole } : {}),
                  ...(resolvedUserId ? { userId: resolvedUserId } : {}),
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
        'Authorization': `Bearer ${verified.token}`,
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
