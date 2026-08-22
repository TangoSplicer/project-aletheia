/** The encrypted case API must reject unauthenticated callers before database or storage access. */
import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("sealCases router authorization", () => {
  it("does not expose the case list to an unauthenticated caller", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.sealCases.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("does not accept encrypted case saves from an unauthenticated caller", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.sealCases.save({
      caseRefHash: "a".repeat(64),
      encryptedPayload: Buffer.alloc(17, 1).toString("base64"),
      encryptionSalt: Buffer.alloc(16, 2).toString("base64"),
      encryptionIv: Buffer.alloc(12, 3).toString("base64"),
      contentDigest: "b".repeat(64),
      verificationStatus: "verified",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
