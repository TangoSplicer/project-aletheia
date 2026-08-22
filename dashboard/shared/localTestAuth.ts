/**
 * Development-only authentication contract. Both the browser and server must opt in,
 * and the server additionally rejects this header outside NODE_ENV=development.
 */
export const LOCAL_TEST_AUTH_HEADER = "x-aletheia-local-test";
export const LOCAL_TEST_AUTH_VALUE = "enable-development-test";
export const LOCAL_TEST_OPEN_ID = "aletheia-development-audit-tester";

export function isDevelopmentTestAuth(nodeEnv: string | undefined, headerValue: string | string[] | undefined) {
  return nodeEnv === "development" && headerValue === LOCAL_TEST_AUTH_VALUE;
}
