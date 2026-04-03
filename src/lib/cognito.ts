'use client';

import { AUTH_STORAGE_KEYS, decodeJwtPayload, userFromClaims, type User, type UserRole } from '@/lib/auth';

const COGNITO_STATE_KEY = 'classpulse_cognito_state';
const COGNITO_PKCE_KEY = 'classpulse_cognito_pkce_verifier';

type CognitoConfig = {
  domainUrl: string;
  clientId: string;
  redirectUri: string;
  logoutUri: string;
  scope: string;
};

export type CognitoSession = {
  user: User;
  idToken: string;
  accessToken: string;
  refreshToken: string | null;
};

function toBase64Url(input: ArrayBuffer): string {
  const bytes = new Uint8Array(input);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function randomString(length = 64): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join('');
}

async function pkceChallenge(verifier: string): Promise<string> {
  const hashed = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64Url(hashed);
}

function normalizeDomain(domain: string | undefined): string | null {
  if (!domain) {
    return null;
  }
  const trimmed = domain.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed.replace(/\/$/, '');
  }
  return `https://${trimmed.replace(/\/$/, '')}`;
}

function getCognitoConfig(): CognitoConfig | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const domainUrl = normalizeDomain(process.env.NEXT_PUBLIC_COGNITO_DOMAIN);
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim() || '';
  const redirectUri = process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI?.trim() || `${window.location.origin}/auth/callback`;
  const logoutUri = process.env.NEXT_PUBLIC_COGNITO_LOGOUT_URI?.trim() || window.location.origin;
  const scope = process.env.NEXT_PUBLIC_COGNITO_SCOPE?.trim() || 'openid email profile';

  if (!domainUrl || !clientId) {
    return null;
  }

  return {
    domainUrl,
    clientId,
    redirectUri,
    logoutUri,
    scope,
  };
}

export async function startCognitoSignIn(roleHint?: UserRole): Promise<void> {
  const config = getCognitoConfig();
  if (!config) {
    const missing: string[] = [];
    const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN?.trim();
    const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID?.trim();
    if (!domain) {
      missing.push('NEXT_PUBLIC_COGNITO_DOMAIN');
    }
    if (!clientId) {
      missing.push('NEXT_PUBLIC_COGNITO_CLIENT_ID');
    }
    throw new Error(`Cognito is not configured. Missing: ${missing.join(', ') || 'unknown values'}.`);
  }

  const state = randomString(64);
  const verifier = randomString(96);
  const challenge = await pkceChallenge(verifier);

  sessionStorage.setItem(COGNITO_STATE_KEY, state);
  sessionStorage.setItem(COGNITO_PKCE_KEY, verifier);

  const authorizeUrl = new URL(`${config.domainUrl}/oauth2/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', config.clientId);
  authorizeUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizeUrl.searchParams.set('scope', config.scope);
  authorizeUrl.searchParams.set('state', roleHint ? `${state}:${roleHint}` : state);
  authorizeUrl.searchParams.set('code_challenge_method', 'S256');
  authorizeUrl.searchParams.set('code_challenge', challenge);

  window.location.assign(authorizeUrl.toString());
}

export function getCognitoLogoutUrl(): string | null {
  const config = getCognitoConfig();
  if (!config) {
    return null;
  }

  const logoutUrl = new URL(`${config.domainUrl}/logout`);
  logoutUrl.searchParams.set('client_id', config.clientId);
  logoutUrl.searchParams.set('logout_uri', config.logoutUri);
  return logoutUrl.toString();
}

export async function completeCognitoSignIn(code: string, state: string): Promise<CognitoSession> {
  const config = getCognitoConfig();
  if (!config) {
    throw new Error('Cognito configuration is missing.');
  }

  const expectedStateRaw = sessionStorage.getItem(COGNITO_STATE_KEY);
  const verifier = sessionStorage.getItem(COGNITO_PKCE_KEY);
  sessionStorage.removeItem(COGNITO_STATE_KEY);
  sessionStorage.removeItem(COGNITO_PKCE_KEY);

  const expectedState = expectedStateRaw?.split(':')[0] ?? null;
  const incomingState = state.split(':')[0];

  if (!expectedState || !verifier || expectedState !== incomingState) {
    throw new Error('Invalid OAuth state. Please try signing in again.');
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch(`${config.domainUrl}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }).toString(),
      signal: controller.signal,
    });
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Token exchange timed out. Please try signing in again.');
    }
    throw new Error('Could not reach Cognito token endpoint. Please try again.');
  } finally {
    window.clearTimeout(timeout);
  }

  let tokenBody: any;
  try {
    tokenBody = await tokenResponse.json();
  } catch {
    tokenBody = null;
  }
  if (!tokenResponse.ok || !tokenBody.id_token) {
    throw new Error(tokenBody?.error_description || tokenBody?.error || `Token exchange failed (${tokenResponse.status}).`);
  }

  const claims = decodeJwtPayload(tokenBody.id_token);
  if (!claims) {
    throw new Error('Could not decode identity token.');
  }

  const user = userFromClaims(claims);
  if (!user) {
    throw new Error('No valid role claim found. Add role as custom:role or cognito group (teacher/parent/admin).');
  }

  sessionStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  sessionStorage.setItem(AUTH_STORAGE_KEYS.token, tokenBody.id_token);
  sessionStorage.setItem(AUTH_STORAGE_KEYS.idToken, tokenBody.id_token);
  if (tokenBody.refresh_token) {
    sessionStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, tokenBody.refresh_token);
  }

  return {
    user,
    idToken: tokenBody.id_token,
    accessToken: tokenBody.access_token,
    refreshToken: tokenBody.refresh_token ?? null,
  };
}
