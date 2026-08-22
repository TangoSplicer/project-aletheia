import { encodeOAuthState } from "@shared/const";

function isAllowedClientOrigin(origin: string) {
  const url = new URL(origin);
  return url.protocol === "https:" || (url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
}

/** Builds a nonce-bound, dynamic-origin OAuth login URL and rejects incomplete or insecure production configuration. */
export function buildOAuthStartUrl({ oauthPortalUrl, appId, origin, nonce }: { oauthPortalUrl?: string; appId?: string; origin: string; nonce: string }) {
  if (!oauthPortalUrl) throw new Error("OAuth portal URL is not configured.");
  if (!appId) throw new Error("OAuth application ID is not configured.");
  if (!isAllowedClientOrigin(origin)) throw new Error("OAuth login requires an HTTPS application origin outside localhost.");
  const redirectUri = `${new URL(origin).origin}/api/oauth/callback`;
  const url = new URL("/app-auth", oauthPortalUrl);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", encodeOAuthState({ redirectUri, nonce }));
  url.searchParams.set("type", "signIn");
  return url.toString();
}
