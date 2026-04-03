export type UserRole = 'teacher' | 'parent' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
}

export const AUTH_STORAGE_KEYS = {
  user: 'classpulse_user',
  token: 'classpulse_token',
  idToken: 'classpulse_id_token',
  refreshToken: 'classpulse_refresh_token',
} as const;

export function isTeacherSideRole(role: UserRole | null | undefined): boolean {
  return role === 'teacher' || role === 'admin';
}

export function getDefaultDashboardPath(role: UserRole): string {
  return isTeacherSideRole(role) ? '/teacher/dashboard' : '/parent/dashboard';
}

export function normalizeWebhookActorRole(role: UserRole): 'teacher' | 'parent' {
  return isTeacherSideRole(role) ? 'teacher' : 'parent';
}

type JwtClaims = Record<string, unknown>;

function readStringClaim(claim: unknown): string | null {
  if (typeof claim !== 'string') {
    return null;
  }
  const value = claim.trim();
  return value ? value : null;
}

function normalizeRole(roleValue: unknown): UserRole | null {
  if (typeof roleValue !== 'string') {
    return null;
  }
  const lowered = roleValue.trim().toLowerCase();
  if (lowered === 'teacher' || lowered === 'parent' || lowered === 'admin') {
    return lowered;
  }
  return null;
}

export function extractRoleFromClaims(claims: JwtClaims): UserRole | null {
  const directRole = normalizeRole(claims.role);
  if (directRole) {
    return directRole;
  }

  const cognitoGroups = claims['cognito:groups'];
  if (Array.isArray(cognitoGroups)) {
    const normalizedGroups = cognitoGroups.map(normalizeRole).filter((role): role is UserRole => !!role);

    if (normalizedGroups.includes('admin')) {
      return 'admin';
    }

    if (normalizedGroups.includes('teacher')) {
      return 'teacher';
    }

    if (normalizedGroups.includes('parent')) {
      return 'parent';
    }

    for (const group of cognitoGroups) {
      const groupRole = normalizeRole(group);
      if (groupRole) {
        return groupRole;
      }
    }
  }

  const customRole = normalizeRole(claims['custom:role']);
  if (customRole) {
    return customRole;
  }

  return null;
}

export function decodeJwtPayload(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}

export function userFromClaims(claims: JwtClaims): User | null {
  const role = extractRoleFromClaims(claims);
  if (!role) {
    return null;
  }

  const id = typeof claims.sub === 'string'
    ? claims.sub
    : typeof claims['cognito:username'] === 'string'
      ? claims['cognito:username']
      : null;

  if (!id) {
    return null;
  }

  const email = readStringClaim(claims.email) ?? `${id}@unknown.local`;

  const profileName = readStringClaim(claims.name);
  const givenName = readStringClaim(claims['given_name']);
  const familyName = readStringClaim(claims['family_name']);
  const preferredUsername = readStringClaim(claims['preferred_username']);
  const combinedName = [givenName, familyName].filter(Boolean).join(' ').trim();

  const fullName = (profileName ?? combinedName) || preferredUsername || email;

  return {
    id,
    role,
    name: fullName,
    email,
    avatarUrl: `https://picsum.photos/seed/${encodeURIComponent(id)}/100/100`,
  };
}
