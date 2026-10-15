import test from "node:test";
import assert from "node:assert/strict";

function decodeDestination(token) {
  const normalized = token.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = Buffer.from(padded, "base64");
  const value = new TextDecoder().decode(binary);
  const destination = new URL(value);
  if (destination.protocol !== "https:" && destination.protocol !== "http:") {
    throw new Error("Unsupported protocol");
  }
  return destination.toString();
}

test("decodes URL-safe Base64 destination tokens", () => {
  const destination = "https://example.com/promo?q=hello%20world";
  const token = Buffer.from(destination, "utf8").toString("base64url");
  assert.equal(decodeDestination(token), destination);
});

test("rejects unsupported protocols", () => {
  const token = Buffer.from("javascript:alert(1)", "utf8").toString("base64url");
  assert.throws(() => decodeDestination(token));
});

test("rejects malformed destination tokens", () => {
  assert.throws(() => decodeDestination("not a valid token"));
});
