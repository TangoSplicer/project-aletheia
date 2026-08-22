import { describe, expect, it } from "vitest";
import { isSafeOAuthCallbackUri } from "./oauthSafety";

describe("isSafeOAuthCallbackUri", () => {
  it("accepts HTTPS callbacks and local development callbacks", () => {
    expect(isSafeOAuthCallbackUri("https://tenant.example.test/api/oauth/callback")).toBe(true);
    expect(isSafeOAuthCallbackUri("http://localhost:3000/api/oauth/callback")).toBe(true);
  });

  it("rejects other paths, origins with credentials, query strings, and insecure public HTTP", () => {
    expect(isSafeOAuthCallbackUri("https://tenant.example.test/callback")).toBe(false);
    expect(isSafeOAuthCallbackUri("https://user:pass@tenant.example.test/api/oauth/callback")).toBe(false);
    expect(isSafeOAuthCallbackUri("https://tenant.example.test/api/oauth/callback?next=https://evil.test")).toBe(false);
    expect(isSafeOAuthCallbackUri("http://tenant.example.test/api/oauth/callback")).toBe(false);
  });
});
