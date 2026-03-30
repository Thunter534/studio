import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeAssessmentIdentifier(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    decoded = value;
  }
  let cleaned = decoded.replace(/-\d+$/, '').trim();
  if (cleaned.startsWith('assignment-')) {
    cleaned = cleaned.replace(/^assignment-/, '').replace(/-/g, ' ').trim();
  }
  return cleaned || null;
}
