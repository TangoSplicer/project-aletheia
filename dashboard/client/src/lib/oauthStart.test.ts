import { describe, expect, it } from "vitest";
import { decodeOAuthState } from "@shared/const";
import { buildOAuthStartUrl } from "./oauthStart";

describe("buildOAuthStartUrl", () => {
  it("uses the actual browser origin and a nonce-bound callback state", () => {
    const url = new URL(buildOAuthStartUrl({ oauthPortalUrl: "https://auth.example.test", appId: "app-1", origin: "https://tenant.example.test", nonce: "nonce-1" }));
    expect(url.pathname).toBe("/app-auth");
    expect(url.searchParams.get("redirectUri")).toBe("https://tenant.example.test/api/oauth/callback");
    expect(decodeOAuthState(url.searchParams.get("state") ?? "")).toEqual({ redirectUri: "https://tenant.example.test/api/oauth/callback", nonce: "nonce-1" });
  });

  it("fails closed for missing config and insecure non-local origins", () => {
    expect(() => buildOAuthStartUrl({ appId: "app-1", origin: "https://tenant.example.test", nonce: "n" })).toThrow("portal");
    expect(() => buildOAuthStartUrl({ oauthPortalUrl: "https://auth.example.test", appId: "app-1", origin: "http://tenant.example.test", nonce: "n" })).toThrow("HTTPS");
  });
});
