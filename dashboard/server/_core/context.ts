import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getUserByOpenId, upsertUser } from "../db";
import { isDevelopmentTestAuth, LOCAL_TEST_AUTH_HEADER, LOCAL_TEST_OPEN_ID } from "../../shared/localTestAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  // A deliberate, dual-gated local identity unblocks development validation when an
  // external OAuth edge is unavailable. It is impossible to activate in production.
  const testHeader = opts.req.headers[LOCAL_TEST_AUTH_HEADER];
  if (!user && isDevelopmentTestAuth(process.env.NODE_ENV, testHeader)) {
    let localUser = await getUserByOpenId(LOCAL_TEST_OPEN_ID);
    if (!localUser) {
      await upsertUser({ openId: LOCAL_TEST_OPEN_ID, name: "Aletheia Local Audit Tester", loginMethod: "development-only", role: "admin", lastSignedIn: new Date() });
      localUser = await getUserByOpenId(LOCAL_TEST_OPEN_ID);
    }
    user = localUser ?? null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
