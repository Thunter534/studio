import { type NextRequest, NextResponse } from 'next/server';
import type { WebhookRequest, WebhookResponse } from '@/lib/events';
import { getMockResponse } from '@/lib/mock-api';
import { getWebhookUrl } from '@/lib/webhook-config';

export async function POST(req: NextRequest) {
  try {
    const body: WebhookRequest = await req.json();

    // --- START MOCK RESPONSE ---
    // For development, we intercept the call and return mock data if a handler exists.
    if (
      process.env.NODE_ENV === 'development' &&
      body.eventName !== 'ASSESSMENT_LIST' &&
      body.eventName !== 'ASSESSMENT_CREATE_DRAFT' &&
      body.eventName !== 'RUBRIC_LIST' &&
      body.eventName !== 'ASSESSMENT_GET' &&
      body.eventName !== 'ASSESSMENT_FINALIZE' &&
      body.eventName !== 'ASSESSMENT_MARK_COMPLETE' &&
      body.eventName !== 'REPORTS_LIST' &&
      body.eventName !== 'REPORT_GET'
    ) {
      const mockResponse = getMockResponse(body);
      if (mockResponse) {
        return NextResponse.json(mockResponse);
      }
    }
    // --- END MOCK RESPONSE ---

    // Get the specific webhook URL for this event
    const webhookUrl = getWebhookUrl(body.eventName);

    if (!webhookUrl) {
      console.error(`No webhook URL configured for event: ${body.eventName}`);
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: {
          message: `Webhook not configured for event: ${body.eventName}`,
          code: 'WEBHOOK_NOT_CONFIGURED',
        },
        correlationId: 'local-config-error',
      }, { status: 404 });
    }

    const authToken = req.headers.get('Authorization');

    if (!authToken) {
      return NextResponse.json<WebhookResponse>({
        success: false,
        error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
        correlationId: 'local-auth-error',
      }, { status: 401 });
    }

    // Forward the request to the specific n8n webhook URL
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authToken,
      },
      body: JSON.stringify(body),
    });

    // Handle cases where n8n itself is down or returns a non-JSON response
    if (!n8nResponse.ok) {
        // Try to get more info from the response if possible
        const errorText = await n8nResponse.text();
        console.error(`n8n webhook (${body.eventName}) returned non-OK status: ${n8nResponse.status}`, errorText);
        return NextResponse.json<WebhookResponse>({
            success: false,
            error: {
                message: `The backend service returned an error (status: ${n8nResponse.status}).`,
                code: 'BACKEND_ERROR',
            },
            correlationId: 'n8n-network-error',
        }, { status: 502 }); // Bad Gateway
    }

    const responseData: WebhookResponse = await n8nResponse.json();

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error in webhook gateway:', error);
    
    if (error instanceof SyntaxError) {
        return NextResponse.json<WebhookResponse>({
            success: false,
            error: { message: 'Invalid request body.', code: 'BAD_REQUEST' },
            correlationId: 'local-request-error',
        }, { status: 400 });
    }
    
    return NextResponse.json<WebhookResponse>({
      success: false,
      error: { message: 'An internal server error occurred in the gateway.', code: 'GATEWAY_ERROR' },
      correlationId: 'local-gateway-error',
    }, { status: 500 });
  }
}

