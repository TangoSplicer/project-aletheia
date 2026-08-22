/** OAuth state carries an attacker-controlled redirect URI. Accept only a clean callback endpoint on HTTPS, or local HTTP for development. */
export function isSafeOAuthCallbackUri(value: string) {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return (url.protocol === "https:" || localHttp) && url.pathname === "/api/oauth/callback" && !url.search && !url.hash && !url.username && !url.password;
  } catch {
    return false;
  }
}
