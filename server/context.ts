import { verifySessionToken } from "./kimi/session";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import type { Context, TrpcContext } from "./types";

export type { TrpcContext };

export async function createContext(req: Request): Promise<Context> {
  const authHeader = req.headers.get("authorization");
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token) {
    return { user: null };
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return { user: null };
  }

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId));

  if (!user) {
    return { user: null };
  }

  return { user };
}
