export type CookieCategories = {
  necessary: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const CONSENT_CATEGORIES: readonly string[];
export function normalizeCategories(value: unknown): CookieCategories | null;
export function formatConsentReport(categories: CookieCategories, timestamp?: string): string;
