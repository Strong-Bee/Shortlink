export const CONSENT_CATEGORIES = Object.freeze(["necessary", "functional", "analytics", "marketing"]);

/**
 * Accept only explicit boolean choices for optional categories.
 * Necessary cookies are always enabled and cannot be disabled.
 */
export function normalizeCategories(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const allowed = ["functional", "analytics", "marketing"];
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && key !== "necessary") return null;
  }
  for (const key of allowed) {
    if (typeof value[key] !== "boolean") return null;
  }
  if (value.necessary !== undefined && value.necessary !== true) return null;
  return {
    necessary: true,
    functional: value.functional,
    analytics: value.analytics,
    marketing: value.marketing,
  };
}

/** The Telegram report deliberately contains categories only, never cookie values. */
export function formatConsentReport(categories, timestamp = new Date().toISOString()) {
  return [
    "SHORTLINK COOKIE CONSENT",
    `Time (UTC): ${timestamp}`,
    "Status: saved",
    "Categories:",
    `- Necessary: ${categories.necessary ? "enabled" : "disabled"}`,
    `- Functional: ${categories.functional ? "accepted" : "rejected"}`,
    `- Analytics: ${categories.analytics ? "accepted" : "rejected"}`,
    `- Marketing: ${categories.marketing ? "accepted" : "rejected"}`,
    "",
    "No cookie values, authentication tokens, or browsing contents are included.",
  ].join("\n");
}
