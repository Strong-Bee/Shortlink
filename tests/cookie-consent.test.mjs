import test from "node:test";
import assert from "node:assert/strict";
import { formatConsentReport, normalizeCategories } from "../lib/cookie-consent.mjs";

test("requires explicit boolean choices for all optional categories", () => {
  assert.deepEqual(normalizeCategories({ functional: false, analytics: true, marketing: false }), {
    necessary: true, functional: false, analytics: true, marketing: false,
  });
});

test("necessary cookies cannot be disabled", () => {
  assert.equal(normalizeCategories({ necessary: false, functional: false, analytics: false, marketing: false }), null);
});

test("rejects arbitrary fields and malformed category values", () => {
  assert.equal(normalizeCategories({ functional: false, analytics: false, marketing: false, cookie: "secret" }), null);
  assert.equal(normalizeCategories({ functional: "yes", analytics: false, marketing: false }), null);
  assert.equal(normalizeCategories(null), null);
});

test("Telegram report contains consent status and categories but no cookie values", () => {
  const report = formatConsentReport({
    necessary: true, functional: false, analytics: true, marketing: false,
  }, "2026-10-15T00:00:00.000Z");
  assert.match(report, /Status: saved/);
  assert.match(report, /Analytics: accepted/);
  assert.match(report, /Functional: rejected/);
  assert.doesNotMatch(report, /sessionid|auth_token|cookie_value/i);
  assert.match(report, /No cookie values/);
});
