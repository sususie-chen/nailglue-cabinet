import { Hono } from "hono";
import { cors } from "hono/cors";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "../server/router";
import { createContext } from "../server/context";

const app = new Hono();
app.use("*", cors());

// 显式拦截所有发送到 /api/trpc 的请求
app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext: () => createContext(c.req.raw),
  });
});

app.get("/api/health", (c) => c.json({ status: "ok" }));

import { handle } from 'hono/vercel';
export const GET = handle(app);
export const POST = handle(app);
export const OPTIONS = handle(app);

// 为了兼容你之前的 esbuild 和 vercel.json，保留默认导出
export default handle(app);
