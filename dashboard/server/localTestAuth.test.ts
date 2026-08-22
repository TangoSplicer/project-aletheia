import { describe, expect, it } from "vitest";
import { isDevelopmentTestAuth, LOCAL_TEST_AUTH_VALUE } from "../shared/localTestAuth";

describe("development-only local test authentication guard", () => {
  it("allows the explicit test header only in development", () => {
    expect(isDevelopmentTestAuth("development", LOCAL_TEST_AUTH_VALUE)).toBe(true);
  });

  it("fails closed in production and for missing or malformed headers", () => {
    expect(isDevelopmentTestAuth("production", LOCAL_TEST_AUTH_VALUE)).toBe(false);
    expect(isDevelopmentTestAuth("development", undefined)).toBe(false);
    expect(isDevelopmentTestAuth("development", "anything-else")).toBe(false);
  });
});
