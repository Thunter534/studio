import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function decodeMaybeEncodedParam(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  let decoded = value;
  for (let i = 0; i < 3; i += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        break;
      }
      decoded = nextDecoded;
    } catch {
      break;
    }
  }

  return decoded;
}
 
export function normalizeAssessmentIdentifier(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  // Handle single and double-encoded route params like "%20" and "%2520".
  let decoded = decodeMaybeEncodedParam(value) ?? value;
  decoded = decoded.replace(/%20/gi, ' ');
  let cleaned = decoded.replace(/-\d+$/, '').trim();
  if (cleaned.startsWith('assignment-')) {
    cleaned = cleaned.replace(/^assignment-/, '').replace(/-/g, ' ').trim();
  }
  return cleaned || null;
}
