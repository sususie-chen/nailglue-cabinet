import type { User } from "@db/schema";

export interface Context {
  user: User | null;
}

export type TrpcContext = Context;
